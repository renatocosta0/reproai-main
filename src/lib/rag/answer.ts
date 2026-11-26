// Grounded answering: route the question (src/lib/rag/intent.ts) → retrieve
// only from the sources that intent allows → abstain or generate from passages
// only → verify every sentence against the passages it cites → return the
// answer with its sources. Used by the patient assistant, the clinician copilot and the
// search_guidelines tool, so all three follow the same rules.

import { chat } from "@/lib/chat-provider";
import { PASSAGE_BY_ID, SOURCES, STATUS_LABEL, citationLabel, type Audience, type PassageStatus } from "@/lib/rag/corpus";
import { retrieve, tokenize, type Retrieval, type RetrievalScope } from "@/lib/rag/retrieve";
import type { RecordPassage } from "@/lib/rag/record-passages";
import { hasArabic, translateQueryPiece } from "@/lib/rag/arabic";
import { classifyIntent, URGENT, type Intent, type IntentDecision } from "@/lib/rag/intent";

export interface SourceRef {
  id: string;
  title: string;
  label: string;
  kind: "guidance" | "record";
  status?: PassageStatus;
  statusLabel?: string;
  url?: string;
  text: string;
}

export interface AnswerSentence {
  text: string;
  cites: string[];
  supported: boolean;
  issues: string[];
}

export interface GroundedAnswer {
  status: "answered" | "abstained" | "urgent";
  mode: "llm" | "extractive" | "none";
  provider?: string;
  sentences: AnswerSentence[];
  sources: SourceRef[];
  /** Sentences removed (patient) or flagged (clinician) because verification failed. */
  removed: number;
  flagged: number;
  retrieval: { engine: Retrieval["engine"]; reason?: string; candidates: number };
  judge?: "on" | "off" | "failed";
  note?: string;
  /** Verification outcome for every generated sentence, including removed ones (no text). */
  checks?: { supported: boolean; issues: string[] }[];
  /** How the question was routed, which decides the sources it may use. */
  intent?: { name: Intent; source: IntentDecision["source"]; confidence: number };
}

export interface AskOptions {
  audience: "patient" | "clinician";
  record?: RecordPassage[];
  /** Previous user question, used to expand very short follow-ups. */
  previousQuestion?: string;
  /** Active UI card/chart context so generic questions ("Explain this") resolve to it. */
  context?: string;
  locale?: "en" | "ar";
  /** Run a second LLM pass that checks each sentence (default from RAG_JUDGE env). */
  judge?: boolean;
}

// ── Safety pre-check ──────────────────────────────────────────────────────────
// URGENT (English) lives in intent.ts; the router also catches Arabic wording.

export function urgentMessage(locale: "en" | "ar" = "en"): string {
  return locale === "ar"
    ? "ما تصفه قد يحتاج إلى رعاية عاجلة. اتصل بالإسعاف على 998 أو توجّه إلى أقرب قسم طوارئ الآن. هذا المساعد لا يستطيع تقييم الحالات العاجلة."
    : "What you describe may need urgent care. Call an ambulance on 998 or go to the nearest emergency department now. This assistant cannot assess urgent symptoms.";
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const NUMBER_WORDS: Record<string, string> = {
  one: "1", two: "2", three: "3", four: "4", five: "5", six: "6", seven: "7", eight: "8", nine: "9", ten: "10", eleven: "11", twelve: "12"
};

function numbersIn(text: string): string[] {
  const words = text.toLowerCase().replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b/g, (w) => NUMBER_WORDS[w]);
  return (words.match(/\d+(?:\.\d+)?/g) ?? []).map((n) => String(Number(n)));
}

// Words that carry no factual claim and may appear without support.
const GENERIC = new Set(
  tokenize(
    "clinician doctor specialist talk discuss speak ask guideline guidance thiqa daman who reproai record result results recommend recommends recommended advise advised advice consider considered may might can help important worth useful also however because generally usually often based according state states say says note noted please your their option options information support supported general case patient patients person people care team".concat(
      " following include includes including such example like based first next one"
    )
  )
);

function support(sentence: string, passageText: string): { numbersOk: boolean; missingNumbers: string[]; overlap: number; unsupportedTerms: string[] } {
  const have = new Set(numbersIn(passageText));
  const missingNumbers = numbersIn(sentence).filter((n) => !have.has(n) && !/^(19|20)\d{2}$/.test(n));
  const ptoks = new Set(tokenize(passageText));
  const stoks = [...new Set(tokenize(sentence))].filter((t) => !GENERIC.has(t) && !/^\d/.test(t) && t.length > 2);
  const unsupportedTerms = stoks.filter((t) => !ptoks.has(t));
  const overlap = stoks.length ? 1 - unsupportedTerms.length / stoks.length : 1;
  return { numbersOk: missingNumbers.length === 0, missingNumbers, overlap, unsupportedTerms };
}

const MIN_OVERLAP = 0.5;

// Outcome words that turn a model score into a claim about the future. They are
// allowed only when the cited passage itself uses them.
const OUTCOME_TERMS = /\b(chance|chances|likelihood|likely|odds|success rate|live birth|get pregnant|conceive within|guarantee[sd]?)\b/gi;
const ATTRIBUTION = /\b(guideline|guidelines|guidance|who|thiqa|daman|eshre|recommend|recommends|recommended)\b/i;

/** Claim-level checks that word overlap cannot catch. */
function claimIssues(sentence: string, cited: string, citeIds: string[]): string[] {
  const issues: string[] = [];
  const lower = cited.toLowerCase();
  for (const m of sentence.match(OUTCOME_TERMS) ?? []) {
    if (!lower.includes(m.toLowerCase())) issues.push(`outcome wording not in source ("${m}")`);
  }
  const onlyRecord = citeIds.length > 0 && citeIds.every((c) => /^(REC|CASE)-/.test(c));
  if (onlyRecord && ATTRIBUTION.test(sentence) && !ATTRIBUTION.test(cited)) {
    issues.push("credits guidance but cites only the record");
  }
  if (/\bestimate\b/i.test(sentence) && /\d+(\.\d+)?\s*%/.test(sentence) && !/(interval|–|-\s*\d|to \d)/i.test(sentence.replace(/^[^%]*%/, ""))) {
    issues.push("estimate stated without its 95% interval");
  }
  return issues;
}

function parseJson(raw: string): { sentences?: { text?: unknown; cites?: unknown }[]; answerable?: unknown } | null {
  const cleaned = raw.replace(/```(?:json)?/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function toSource(id: string, record: Map<string, RecordPassage>, asker: "patient" | "clinician"): SourceRef | null {
  const r = record.get(id);
  if (r) return { id, title: r.title, label: "Your record", kind: "record", url: r.url, text: r.text };
  const p = PASSAGE_BY_ID[id];
  if (!p) return null;
  // Internal doc links can point at clinician-only pages; patients never get
  // those links (the citation itself is still shown).
  const docUrl = SOURCES[p.doc]?.url;
  const url = asker === "clinician" || docUrl?.startsWith("http") ? docUrl : undefined;
  return { id, title: p.title, label: citationLabel(p), kind: "guidance", status: p.status, statusLabel: STATUS_LABEL[p.status], url, text: p.text };
}

function systemPrompt(o: AskOptions, intent: Intent): string {
  const scope: RetrievalScope = intent === "product" ? "product" : "clinical";
  const whose = o.audience === "clinician" ? "the patient case" : "the person";
  const who =
    o.audience === "patient"
      ? "You answer questions from a person using ReproAI, a reproductive-health app in Abu Dhabi. Write in plain, warm, calm language at a reading age of about 12. Never alarm. You are not a doctor: you explain, you do not diagnose or prescribe."
      : "You answer questions from a licensed fertility clinician using ReproAI. Be concise and clinical. You explain and summarise; decisions remain with the clinician.";
  const sourcePolicy =
    intent === "product"
      ? "This is a question about ReproAI product behavior. Use only the internal product passages provided. Explain what the app does, and do not use those passages to make or imply a clinical claim about the person's health."
      : intent === "patient_data"
        ? `This is a question about what is recorded for ${whose}. Use only the record passages. Report what is recorded, in plain words; do not add medical explanations, interpretation or guidance.`
        : intent === "clinical_general"
          ? `This is a general clinical question. It is not about ${whose}, and no personal record is provided: do not mention or guess anyone's results. Use only the clinical source passages. Internal ReproAI product rules and documentation are not evidence and must not support any clinical claim.`
          : `This question is about ${whose}'s own situation. Use the record only for facts about ${whose}'s recorded data, and use only non-internal clinical source passages for medical explanations. Internal ReproAI product rules and documentation are not evidence and must not support any clinical claim. If the clinical passages do not support an explanation, say that clearly instead of using an internal rule.`;
  const attributionPolicy = scope === "product"
    ? "Attribute each point to where it comes from: a clinician note is the clinician's view, a rule is a ReproAI rule, and only guidance passages are guidelines."
    : "Attribute clinician notes as the clinician's view. Do not mention, cite or rely on a ReproAI rule in a clinical answer; only external guidance passages may be called guidelines.";
  return `${who}

You may use ONLY the PASSAGES given in the user message. Each passage has an ID in square brackets.
${sourcePolicy}
Rules:
1. Every sentence must be supported by the passage(s) it cites. Do not add facts, numbers, percentages, drug names, doses or time frames that are not written in those passages.
2. Do not calculate or estimate anything. Copy numbers exactly as they appear in the passage. Call a model estimate a "model estimate" and always give its 95% interval; never describe it as a chance of pregnancy, success or live birth.
   ${attributionPolicy}
3. The first sentence must directly answer the question that was asked. If the passages do not answer that question (for example, they are about a different topic), set "answerable" to false and return no sentences. Do not answer from general knowledge, and do not fill the answer with loosely related passages.
4. Answer in at most ${o.audience === "patient" ? 5 : 8} short sentences.${o.locale === "ar" ? " Write the sentences in Arabic; keep numbers as digits." : ""}
5. Reply with JSON only, no other text, in this shape:
{"answerable": true, "sentences": [{"text": "...", "cites": ["PASSAGE-ID"]}]}`;
}

function extractive(ids: string[], record: Map<string, RecordPassage>): AnswerSentence[] {
  return ids.slice(0, 2).map((id) => {
    const r = record.get(id);
    const p = PASSAGE_BY_ID[id];
    return { text: r ? r.text : p.text, cites: [id], supported: true, issues: [] };
  });
}

async function judgeSentences(sentences: AnswerSentence[], passages: Map<string, string>): Promise<boolean[] | null> {
  const items = sentences.map((s, i) => `S${i + 1}: ${s.text}\nCited: ${s.cites.map((c) => `[${c}] ${passages.get(c) ?? ""}`).join("\n")}`).join("\n\n");
  try {
    const { reply } = await chat(
      [
        { role: "system", content: 'You check whether each sentence is fully supported by its cited passages. A sentence is unsupported if it adds any fact, number or claim not stated in them. Reply with JSON only: {"supported": [true, false, ...]} in sentence order.' },
        { role: "user", content: items }
      ],
      { temperature: 0, maxTokens: 600 }
    );
    const parsed = parseJson(reply) as { supported?: unknown } | null;
    if (!parsed || !Array.isArray(parsed.supported) || parsed.supported.length !== sentences.length) return null;
    return parsed.supported.map((x) => x === true);
  } catch {
    return null;
  }
}

/** Clinical record passages ranked by the terms they share with the question (Arabic mapped to English corpus terms). */
function rankRecord(question: string, record: RecordPassage[]): RecordPassage[] {
  const clinicalRecord = record.filter((r) => r.clinical !== false);
  const terms = new Set(tokenize(question));
  for (const piece of question.split(/\s+/)) if (hasArabic(piece)) for (const t of translateQueryPiece(piece)) for (const k of tokenize(t)) terms.add(k);
  return clinicalRecord
    .map((r, i) => ({ r, i, n: tokenize(`${r.title} ${r.text}`).filter((t) => terms.has(t)).length }))
    .sort((a, b) => b.n - a.n || a.i - b.i)
    .map((x) => x.r);
}

const GENERIC_CONTEXT_RE =
  /^(?:please\s+)?(?:explain|clarify|interpret|elaborate|tell me(?: more)? about|help me understand|what (?:is|does|are)|what'?s|explica|explique|o que [eé]|entender|me explica|اشرح|وضح|ما هو|ما هي|ماذا يعني)(?:\s+(?:this|that|it|these|here|my result|my data|this chart|this graph|isso|isto|aqui|هذا|هذه))?[\s?!.]*$/i;

function isGenericContextQuestion(q: string): boolean {
  const trimmed = q.trim();
  if (GENERIC_CONTEXT_RE.test(trimmed)) return true;
  if (/\b(isso|isto|this|that|aqui)\b/i.test(trimmed) && tokenize(trimmed).length <= 3) return true;
  return false;
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function groundedAnswer(question: string, o: AskOptions): Promise<GroundedAnswer> {
  const locale = o.locale ?? "en";
  const q = question.trim().slice(0, 1000);
  const urgentReply = (intent?: GroundedAnswer["intent"]): GroundedAnswer => ({
    status: "urgent", mode: "none", sentences: [{ text: urgentMessage(locale), cites: [], supported: true, issues: [] }],
    sources: [], removed: 0, flagged: 0, retrieval: { engine: "bm25-local", candidates: 0 }, intent
  });
  // Deterministic check first, so an urgent message never waits on an LLM call.
  if (URGENT.test(q)) return urgentReply({ name: "urgent", source: "rules", confidence: 1 });

  const ctx = o.context?.trim().slice(0, 300) || undefined;
  const genericWithCtx = Boolean(ctx && isGenericContextQuestion(q));
  const intentInput = genericWithCtx ? `Explain my ${ctx}` : q;

  // ── Route: the intent decides which sources this question may use ──
  const decision = await classifyIntent(intentInput, { audience: o.audience, previousQuestion: o.previousQuestion });
  let intent = decision.intent;
  if (genericWithCtx && o.record?.length && intent === "clinical_general") {
    intent = "clinical_personal";
  }
  const intentInfo: GroundedAnswer["intent"] = { name: intent, source: decision.source, confidence: decision.confidence };
  if (intent === "urgent") return urgentReply(intentInfo);
  if (intent === "out_of_scope") {
    return {
      status: "abstained", mode: "none", sentences: [], sources: [], removed: 0, flagged: 0,
      retrieval: { engine: "bm25-local", candidates: 0 }, intent: intentInfo,
      note: "Outside what this assistant can answer: it covers fertility guidance, the person's own record and how ReproAI works, and it does not diagnose, prescribe or give doses."
    };
  }

  const scope: RetrievalScope = intent === "product" ? "product" : "clinical";
  const useRecord = intent === "patient_data" || intent === "clinical_personal";
  const useGuidance = intent !== "patient_data";
  const recordQuery = genericWithCtx && ctx ? `${ctx} ${q}` : q;
  let recordHits = useRecord ? rankRecord(recordQuery, o.record ?? []).slice(0, 5) : [];
  if (useRecord && ctx && recordHits.length === 0 && o.record?.length) {
    recordHits = rankRecord(ctx, o.record).slice(0, 5);
  }
  const recordMap = new Map((o.record ?? []).map((r) => [r.id, r]));
  if (intent === "patient_data" && recordHits.length === 0) {
    return {
      status: "abstained", mode: "none", sentences: [], sources: [], removed: 0, flagged: 0,
      retrieval: { engine: "bm25-local", candidates: 0 }, intent: intentInfo,
      note: "This question is about a personal record, and no record is available here."
    };
  }

  const audience: Audience = o.audience === "clinician" ? "clinician" : "both";
  const searchText =
    genericWithCtx && ctx
      ? ctx
      : q.split(/\s+/).length < 5 && o.previousQuestion
        ? `${o.previousQuestion} ${q}`
        : ctx && q.split(/\s+/).length < 6
          ? `${ctx} ${q}`
          : q;
  const retrieval: Retrieval = useGuidance
    ? await retrieve(searchText, { audience, top: 4, scope })
    : { query: searchText, hits: [], abstain: false, engine: "bm25-local", reason: "Record-only question: guidance was not searched." };

  const asksHowAppEstimates = (intent === "clinical_personal" || (o.audience === "clinician" && intent === "clinical_general")) && /\b(reproai|estimate[ds]?|calculat|method|how .* work|variable mode|paused|wilson|shapley|cohort|suppressed|simulation|evidence|interval|read this)\b/i.test(`${q} ${ctx ?? ""}`);
  const productRetrieval = asksHowAppEstimates ? await retrieve(searchText, { audience, top: 2, scope: "product" }) : null;
  const approvedHits = [...retrieval.hits, ...(productRetrieval?.hits ?? [])].filter((hit) => {
    const canonical = PASSAGE_BY_ID[hit.passage.id];
    if (!canonical) return false;
    if (scope === "product") return canonical.status === "internal";
    return asksHowAppEstimates ? true : canonical.status !== "internal";
  });
  const passageIds = [...recordHits.map((r) => r.id), ...approvedHits.map((h) => h.passage.id)];
  const passageText = new Map<string, string>(passageIds.map((id) => [id, recordMap.get(id)?.text ?? PASSAGE_BY_ID[id]?.text ?? ""]));
  const base = { retrieval: { engine: retrieval.engine, reason: retrieval.reason, candidates: passageIds.length }, intent: intentInfo };

  if (passageIds.length === 0) {
    return { status: "abstained", mode: "none", sentences: [], sources: [], removed: 0, flagged: 0, ...base, note: "Not covered by ReproAI's guidance library." };
  }

  const questionForLlm = genericWithCtx && ctx ? `Explain ${ctx} (${q})` : q;
  const contextLine = ctx ? `VIEW_CONTEXT: ${ctx}\n` : "";
  const userMsg = `PASSAGES:\n${passageIds.map((id) => `[${id}] ${passageText.get(id)}`).join("\n\n")}\n\n${contextLine}QUESTION: ${questionForLlm}`;
  let raw: string | null = null;
  let provider: string | undefined;
  try {
    const r = await chat([{ role: "system", content: systemPrompt(o, intent) }, { role: "user", content: userMsg }], { temperature: 0, maxTokens: o.audience === "clinician" ? 1800 : 1000 });
    raw = r.reply;
    provider = r.provider;
  } catch (e) {
    console.warn("[rag] LLM unavailable, extractive answer:", e instanceof Error ? e.message : e);
  }

  const toSources = (ids: string[]) => [...new Set(ids)].map((id) => toSource(id, recordMap, o.audience)).filter(Boolean) as SourceRef[];

  if (raw === null) {
    const sentences = extractive(passageIds, recordMap);
    return { status: "answered", mode: "extractive", sentences, sources: toSources(sentences.flatMap((s) => s.cites)), removed: 0, flagged: 0, ...base, note: "The AI service is unavailable, so the most relevant passages are shown as written." };
  }

  const parsed = parseJson(raw);
  if (!parsed) {
    const sentences = extractive(passageIds, recordMap);
    return { status: "answered", mode: "extractive", provider, sentences, sources: toSources(sentences.flatMap((s) => s.cites)), removed: 0, flagged: 0, ...base, note: "The AI reply could not be checked, so the most relevant passages are shown as written." };
  }
  if (parsed.answerable === false || !Array.isArray(parsed.sentences) || parsed.sentences.length === 0) {
    return { status: "abstained", mode: "llm", provider, sentences: [], sources: toSources(passageIds.slice(0, 3)), removed: 0, flagged: 0, ...base, note: "The passages found do not answer this question." };
  }

  // ── Verification ──
  let sentences: AnswerSentence[] = parsed.sentences.slice(0, 10).map((s) => {
    const text = String(s.text ?? "").trim();
    const cites = Array.isArray(s.cites) ? [...new Set(s.cites.map(String))] : [];
    const issues: string[] = [];
    const valid = cites.filter((c) => passageText.has(c));
    if (cites.length === 0) issues.push("no citation");
    if (valid.length < cites.length) issues.push(`cites a passage that was not retrieved (${cites.filter((c) => !passageText.has(c)).join(", ")})`);
    const cited = valid.map((c) => passageText.get(c)).join(" ");
    if (valid.length) {
      const sp = support(text, cited);
      if (!sp.numbersOk) issues.push(`number not in cited passage: ${sp.missingNumbers.join(", ")}`);
      issues.push(...claimIssues(text, cited, valid));
      if (scope === "clinical" && /\b(?:reproai\s+rule|rule\s+[A-Z][A-Z0-9-]*)\b/i.test(text)) {
        issues.push("clinical answer attributes a claim to an internal ReproAI rule");
      }
      // Lexical overlap is checked for English only; Arabic answers rely on numbers and the judge.
      if (locale === "en" && sp.overlap < MIN_OVERLAP) issues.push(`wording not found in cited passage (${sp.unsupportedTerms.slice(0, 4).join(", ")})`);
      for (const quote of text.match(/"([^"]{8,})"/g) ?? []) {
        if (!cited.toLowerCase().includes(quote.slice(1, -1).toLowerCase())) issues.push("quotation does not match the passage");
      }
    }
    return { text, cites: valid, supported: issues.length === 0, issues };
  }).filter((s) => s.text);

  const useJudge = o.judge ?? process.env.RAG_JUDGE === "on";
  let judge: GroundedAnswer["judge"] = useJudge ? "on" : "off";
  if (useJudge && sentences.some((s) => s.supported)) {
    const verdicts = await judgeSentences(sentences, passageText);
    if (!verdicts) judge = "failed";
    else sentences = sentences.map((s, i) => (verdicts[i] || !s.supported ? s : { ...s, supported: false, issues: [...s.issues, "judge: not supported"] }));
  }

  const failed = sentences.filter((s) => !s.supported).length;
  const checks = sentences.map((s) => ({ supported: s.supported, issues: s.issues }));
  // Patients only ever see verified sentences. Clinicians see flagged ones, marked.
  if (o.audience === "patient") sentences = sentences.filter((s) => s.supported);
  if (sentences.length === 0) {
    return { status: "abstained", mode: "llm", provider, sentences: [], sources: toSources(passageIds.slice(0, 3)), removed: failed, flagged: 0, ...base, judge, checks, note: "An answer was generated but could not be verified against the sources, so it is not shown." };
  }
  return {
    status: "answered",
    mode: "llm",
    provider,
    sentences,
    sources: toSources(sentences.flatMap((s) => s.cites)),
    removed: o.audience === "patient" ? failed : 0,
    flagged: o.audience === "clinician" ? failed : 0,
    ...base,
    judge,
    checks
  };
}

/** Plain-text rendering for API clients that only read `reply`. */
export function answerText(a: GroundedAnswer): string {
  if (a.status === "abstained" && a.intent?.name === "out_of_scope") return "That is outside what I can help with. I can answer questions about fertility guidance, your own record and how ReproAI works, but I can't diagnose, prescribe or give doses. Please ask your clinician.";
  if (a.status === "abstained") return "I can't answer that from ReproAI's guidance library or your record. Please ask your clinician.";
  return a.sentences.map((s) => `${s.text}${s.cites.length ? ` [${s.cites.join(", ")}]` : ""}${s.supported ? "" : " (unverified)"}`).join(" ");
}
