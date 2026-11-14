// Grounded answering: retrieve → abstain or generate from passages only →
// verify every sentence against the passages it cites → return the answer with
// its sources. Used by the patient assistant, the clinician copilot and the
// search_guidelines tool, so all three follow the same rules.

import { chat } from "@/lib/chat-provider";
import { PASSAGE_BY_ID, SOURCES, STATUS_LABEL, citationLabel, type Audience, type PassageStatus } from "@/lib/rag/corpus";
import { retrieve, tokenize, type Retrieval } from "@/lib/rag/retrieve";
import type { RecordPassage } from "@/lib/rag/record-passages";

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
}

export interface AskOptions {
  audience: "patient" | "clinician";
  record?: RecordPassage[];
  /** Previous user question, used to expand very short follow-ups. */
  previousQuestion?: string;
  locale?: "en" | "ar";
  /** Run a second LLM pass that checks each sentence (default from RAG_JUDGE env). */
  judge?: boolean;
}

// ── Safety pre-check ──────────────────────────────────────────────────────────
const URGENT = /\b(heavy bleeding|bleeding heavily|severe (pain|abdominal pain|cramp)|faint(ed|ing)?|suicid|kill myself|self[- ]harm|ectopic|can'?t breathe|chest pain)\b/i;

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

function systemPrompt(o: AskOptions): string {
  const who =
    o.audience === "patient"
      ? "You answer questions from a person using ReproAI, a reproductive-health app in Abu Dhabi. Write in plain, warm, calm language at a reading age of about 12. Never alarm. You are not a doctor: you explain, you do not diagnose or prescribe."
      : "You answer questions from a licensed fertility clinician using ReproAI. Be concise and clinical. You explain and summarise; decisions remain with the clinician.";
  return `${who}

You may use ONLY the PASSAGES given in the user message. Each passage has an ID in square brackets.
Rules:
1. Every sentence must be supported by the passage(s) it cites. Do not add facts, numbers, percentages, drug names, doses or time frames that are not written in those passages.
2. Do not calculate or estimate anything. Copy numbers exactly as they appear in the passage. Call a model estimate a "model estimate" and always give its 95% interval; never describe it as a chance of pregnancy, success or live birth.
   Attribute each point to where it comes from: a clinician note is the clinician's view, a rule is a ReproAI rule, and only guidance passages are "guidelines".
3. If the passages do not answer the question, set "answerable" to false and return no sentences. Do not answer from general knowledge.
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

/** Record passages that share terms with the question, or all of them for a personal question. */
function relevantRecord(question: string, record: RecordPassage[]): RecordPassage[] {
  if (record.length === 0) return [];
  const personal = /\b(my|me|mine|i|i'm|am i|our|we|this case|the case|this patient|summar|her|his|their|couple|consultation)\b/i.test(question);
  const q = new Set(tokenize(question));
  const scored = record
    .map((r) => ({ r, n: tokenize(`${r.title} ${r.text}`).filter((t) => q.has(t)).length }))
    .filter((x) => x.n > 0 || personal);
  return scored.sort((a, b) => b.n - a.n).map((x) => x.r);
}

// ── Main entry point ──────────────────────────────────────────────────────────
export async function groundedAnswer(question: string, o: AskOptions): Promise<GroundedAnswer> {
  const locale = o.locale ?? "en";
  const q = question.trim().slice(0, 1000);
  if (URGENT.test(q)) {
    return {
      status: "urgent", mode: "none", sentences: [{ text: urgentMessage(locale), cites: [], supported: true, issues: [] }],
      sources: [], removed: 0, flagged: 0, retrieval: { engine: "bm25-local", candidates: 0 }
    };
  }

  const audience: Audience = o.audience === "clinician" ? "clinician" : "both";
  const searchText = q.split(/\s+/).length < 5 && o.previousQuestion ? `${o.previousQuestion} ${q}` : q;
  const retrieval = await retrieve(searchText, { audience, top: 4 });
  const recordHits = relevantRecord(q, o.record ?? []).slice(0, 5);
  const recordMap = new Map((o.record ?? []).map((r) => [r.id, r]));

  const passageIds = [...recordHits.map((r) => r.id), ...retrieval.hits.map((h) => h.passage.id)];
  const passageText = new Map<string, string>(passageIds.map((id) => [id, recordMap.get(id)?.text ?? PASSAGE_BY_ID[id]?.text ?? ""]));
  const base = { retrieval: { engine: retrieval.engine, reason: retrieval.reason, candidates: passageIds.length } };

  if (passageIds.length === 0) {
    return { status: "abstained", mode: "none", sentences: [], sources: [], removed: 0, flagged: 0, ...base, note: "Not covered by ReproAI's guidance library." };
  }

  const userMsg = `PASSAGES:\n${passageIds.map((id) => `[${id}] ${passageText.get(id)}`).join("\n\n")}\n\nQUESTION: ${q}`;
  let raw: string | null = null;
  let provider: string | undefined;
  try {
    const r = await chat([{ role: "system", content: systemPrompt(o) }, { role: "user", content: userMsg }], { temperature: 0, maxTokens: o.audience === "clinician" ? 1800 : 1000 });
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
  if (a.status === "abstained") return "I can't answer that from ReproAI's guidance library or your record. Please ask your clinician.";
  return a.sentences.map((s) => `${s.text}${s.cites.length ? ` [${s.cites.join(", ")}]` : ""}${s.supported ? "" : " (unverified)"}`).join(" ");
}
