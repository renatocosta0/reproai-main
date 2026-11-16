// Retrieval over the grounding corpus: BM25 with light stemming, clinical
// synonym expansion, and Arabic → English term mapping (src/lib/rag/arabic.ts),
// plus a deterministic abstention rule. Retrieval always runs before any
// generation; the LLM never decides whether to look things up.
//
// If Azure AI Search is configured (AZURE_SEARCH_*), its results are used instead
// and mapped to the same Passage shape, so the rest of the pipeline is unchanged.

import { getAzureSearchConfig } from "@/lib/azure/config";
import { PASSAGES, type Audience, type Passage } from "@/lib/rag/corpus";
import { hasArabic, translateQueryPiece } from "@/lib/rag/arabic";

export interface Hit {
  passage: Passage;
  score: number;
  /** Share of the query's content terms found in this passage (0–1). */
  coverage: number;
}

export interface Retrieval {
  query: string;
  hits: Hit[];
  /** True when nothing relevant was found and the assistant must not answer from guidance. */
  abstain: boolean;
  reason?: string;
  engine: "bm25-local" | "azure-search";
}

// Abstention thresholds, tuned on the evaluation set (npm run rag:eval).
export const MIN_SCORE = 2.2;
export const MIN_COVERAGE = 0.34;

const STOP = new Set(
  "a an the and or but if of to in on at by for with from as is are was were be been being do does did have has had i me my we our you your he she it they them this that these those what which who whom how when where why can could should would will may might must not no yes so than then there here about into over under after before again any all some more most very just also only own same too please tell explain know want need get mean means".split(" ")
);

// Lay word → clinical words. Expansion terms are added to the query with lower weight.
const SYNONYMS: Record<string, string[]> = {
  pregnant: ["conceive", "pregnancy"],
  conceive: ["pregnancy", "trying"],
  baby: ["pregnancy", "conceive"],
  sperm: ["semen"],
  semen: ["sperm"],
  husband: ["male", "partner"],
  wife: ["female", "partner"],
  man: ["male"],
  men: ["male"],
  woman: ["female", "women"],
  women: ["female", "woman"],
  egg: ["oocyte", "ovarian"],
  eggs: ["oocyte", "ovarian"],
  freezing: ["cryopreservation", "preservation", "storage"],
  freeze: ["cryopreservation", "preservation"],
  reserve: ["amh", "afc", "ovarian"],
  weight: ["bmi"],
  bmi: ["weight"],
  fat: ["bmi", "weight"],
  period: ["cycle", "amenorrhoea"],
  periods: ["cycle", "amenorrhoea"],
  irregular: ["amenorrhoea", "oligo"],
  regular: ["irregular", "cycle"],
  early: ["earlier", "sooner"],
  reduced: ["low"],
  cancer: ["oncology", "chemotherapy"],
  chemo: ["chemotherapy", "oncology"],
  smoke: ["smoking", "tobacco"],
  smoking: ["tobacco"],
  cigarettes: ["tobacco", "smoking"],
  drinking: ["alcohol"],
  insurance: ["coverage", "covered", "thiqa"],
  covered: ["coverage", "thiqa"],
  cost: ["coverage", "paid"],
  pay: ["coverage", "paid"],
  ivf: ["vitro", "fertilisation"],
  stress: ["anxiety", "psychosocial"],
  worried: ["anxiety", "psychosocial"],
  anxious: ["anxiety", "psychosocial", "emotional"],
  scared: ["anxiety", "emotional"],
  depressed: ["depression", "emotional"],
  upset: ["emotional", "support"],
  feel: ["emotional"],
  privacy: ["consent", "share"],
  score: ["estimate", "model"],
  chance: ["estimate", "probability"],
  old: ["age"],
  older: ["age"],
  age: ["older"],
  watch: ["wearable"],
  temperature: ["bbt"]
};

/** Very small English stemmer: enough to match plural and -ing/-ed forms. */
function stem(w: string): string {
  if (w.length <= 3) return w;
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("sses")) return w.slice(0, -2);
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  if (w.endsWith("s") && !w.endsWith("ss") && !w.endsWith("us") && !w.endsWith("is")) return w.slice(0, -1);
  return w;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9؀-ۿ\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !STOP.has(w))
    .map(stem);
}

interface Indexed {
  passage: Passage;
  tf: Map<string, number>;
  len: number;
}

let INDEX: { docs: Indexed[]; df: Map<string, number>; avgLen: number } | null = null;

function index() {
  if (INDEX) return INDEX;
  const docs: Indexed[] = PASSAGES.map((p) => {
    // Title and extra terms are weighted twice.
    const toks = [...tokenize(p.text), ...tokenize(p.title), ...tokenize(p.title), ...tokenize((p.terms ?? []).join(" ")), ...tokenize((p.terms ?? []).join(" "))];
    const tf = new Map<string, number>();
    for (const t of toks) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { passage: p, tf, len: toks.length };
  });
  const df = new Map<string, number>();
  for (const d of docs) for (const t of d.tf.keys()) df.set(t, (df.get(t) ?? 0) + 1);
  const avgLen = docs.reduce((s, d) => s + d.len, 0) / docs.length;
  INDEX = { docs, df, avgLen };
  return INDEX;
}

interface Query {
  weights: Map<string, number>;
  /** One group per original content term: the term plus its synonyms. */
  groups: string[][];
}

function bm25(query: Query, audience: Audience): Hit[] {
  const { docs, df, avgLen } = index();
  const N = docs.length;
  const k1 = 1.2;
  const b = 0.75;
  const queryTerms = query.weights;
  const hits: Hit[] = [];
  for (const d of docs) {
    if (audience === "both" && d.passage.audience === "clinician") continue;
    let score = 0;
    for (const [t, w] of queryTerms) {
      const f = d.tf.get(t);
      if (!f) continue;
      const n = df.get(t) ?? 0;
      const idf = Math.log(1 + (N - n + 0.5) / (n + 0.5));
      score += w * idf * ((f * (k1 + 1)) / (f + k1 * (1 - b + (b * d.len) / avgLen)));
    }
    // A query term counts as covered if it, or one of its synonyms, is in the passage.
    const matched = query.groups.filter((g) => g.some((t) => d.tf.has(t))).length;
    if (score > 0) hits.push({ passage: d.passage, score, coverage: query.groups.length ? matched / query.groups.length : 0 });
  }
  return hits.sort((a, b2) => b2.score - a.score);
}

function parseQuery(query: string): Query {
  const weights = new Map<string, number>();
  const groups: string[][] = [];
  // Split into ranking terms. Latin words are used as-is; Arabic words are
  // mapped through the fixed lexicon in src/lib/rag/arabic.ts to the English
  // corpus terms they carry, so an Arabic question ranks the same passages as
  // its English equivalent. Unmapped Arabic words are kept as unmatched terms
  // (they lower coverage, which supports honest abstention).
  const raw: string[] = [];
  for (const piece of query.split(/\s+/)) {
    if (!piece) continue;
    if (hasArabic(piece)) raw.push(...translateQueryPiece(piece));
    else raw.push(...piece.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/));
  }
  for (const w of raw) {
    if (!w || w.length <= 1 || STOP.has(w)) continue;
    const t = stem(w);
    if (!t) continue;
    weights.set(t, 1);
    const syns = (SYNONYMS[w] ?? SYNONYMS[t] ?? []).map(stem);
    for (const st of syns) if (!weights.has(st)) weights.set(st, 0.5);
    if (!groups.some((g) => g[0] === t)) groups.push([t, ...syns]);
  }
  return { weights, groups };
}

/**
 * Retrieve passages for a question. `audience: "both"` (patients) excludes
 * clinician-only passages. Abstains when the best match is weak.
 */
export async function retrieve(query: string, opts: { top?: number; audience?: Audience } = {}): Promise<Retrieval> {
  const top = opts.top ?? 4;
  const audience = opts.audience ?? "both";

  const azure = getAzureSearchConfig();
  if (azure) {
    try {
      const hits = await azureSearch(query, top, azure);
      return { query, hits, abstain: hits.length === 0, reason: hits.length ? undefined : "No passages returned by the search index.", engine: "azure-search" };
    } catch (e) {
      console.warn("[rag] Azure AI Search failed, using local corpus:", e);
    }
  }

  const parsed = parseQuery(query);
  if (parsed.groups.length === 0) {
    return { query, hits: [], abstain: true, reason: "The question has no searchable terms.", engine: "bm25-local" };
  }
  const all = bm25(parsed, audience);
  const best = all[0];
  // Keep passages that are reasonably close to the best one.
  const hits = all.filter((h) => best && h.score >= best.score * 0.45).slice(0, top);
  const abstain = !best || best.score < MIN_SCORE || best.coverage < MIN_COVERAGE;
  return {
    query,
    hits: abstain ? [] : hits,
    abstain,
    reason: abstain
      ? best
        ? `Best match "${best.passage.title}" was too weak (score ${best.score.toFixed(2)}, ${Math.round(best.coverage * 100)}% of terms).`
        : "No passage matched the question."
      : undefined,
    engine: "bm25-local"
  };
}

/** Diagnostics for the evaluation script: best raw match even when abstaining. */
export function rawRanking(query: string, audience: Audience = "clinician"): Hit[] {
  return bm25(parseQuery(query), audience);
}

async function azureSearch(query: string, top: number, cfg: { endpoint: string; apiKey: string; index: string }): Promise<Hit[]> {
  const url = `${cfg.endpoint}/indexes/${encodeURIComponent(cfg.index)}/docs/search?api-version=2024-07-01`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": cfg.apiKey },
    body: JSON.stringify({ search: query, top, queryType: "simple" }),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`Azure AI Search error (${res.status})`);
  const data = (await res.json()) as { value?: Array<Record<string, unknown>> };
  return (data.value ?? []).map((doc, i) => ({
    passage: {
      id: String(doc.id ?? `AZ-${i + 1}`),
      doc: "REPROAI",
      section: String(doc.section ?? doc.title ?? "Search index"),
      status: "summary" as const,
      audience: "both" as const,
      title: String(doc.title ?? doc.source ?? `Result ${i + 1}`),
      text: String(doc.content ?? doc.chunk ?? "")
    },
    score: Number(doc["@search.score"] ?? 0),
    coverage: 1
  }));
}
