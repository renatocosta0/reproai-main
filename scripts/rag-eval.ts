// Evaluates the grounded assistant on src/lib/rag/eval-set.ts and writes
// src/lib/rag/eval-results.json, which the clinician Evidence page shows.
//
//   npm run rag:eval                  retrieval + end-to-end (needs an LLM key)
//   npm run rag:eval -- --retrieval   retrieval and abstention only (no LLM)
//
// Retrieval metrics are deterministic. End-to-end metrics depend on the LLM
// provider and model in use and are reported with that provider's name.

import { writeFileSync } from "node:fs";
import { join } from "node:path";

for (const f of [".env.local", ".env"]) {
  try {
    process.loadEnvFile(f);
  } catch {
    /* file absent */
  }
}

import { EVAL_SET } from "@/lib/rag/eval-set";
import { retrieve, MIN_COVERAGE, MIN_SCORE } from "@/lib/rag/retrieve";
import { PASSAGES } from "@/lib/rag/corpus";
import type { GroundedAnswer } from "@/lib/rag/answer";

interface P { numerator: number; denominator: number; rate: number | null; low: number | null; high: number | null }
function wilson(k: number, n: number, z = 1.96): P {
  if (n === 0) return { numerator: k, denominator: n, rate: null, low: null, high: null };
  const p = k / n;
  const d = 1 + (z * z) / n;
  const c = (p + (z * z) / (2 * n)) / d;
  const h = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / d;
  return { numerator: k, denominator: n, rate: p, low: Math.max(0, c - h), high: Math.min(1, c + h) };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function rowFor(item: (typeof EVAL_SET)[number], ids: string[], abstained: boolean, isHit: boolean, e2e: GroundedAnswer | null) {
  return {
    q: item.q,
    kind: item.kind,
    lang: item.lang ?? "en",
    answerable: item.answerable,
    expect: item.expect ?? [],
    retrieved: ids,
    retrievalAbstained: abstained,
    hit: item.answerable ? isHit : null,
    ...(e2e
      ? {
          status: e2e.status,
          mode: e2e.mode,
          shown: e2e.sentences.length,
          removed: e2e.removed,
          cites: [...new Set(e2e.sentences.flatMap((s) => s.cites))],
          issues: (e2e.checks ?? []).flatMap((c) => c.issues)
        }
      : {})
  };
}

async function main() {
  const retrievalOnly = process.argv.includes("--retrieval");
  const rows: Record<string, unknown>[] = [];
  let provider: string | null = null;

  // Headline figures use the English questions; Arabic ones are reported separately.
  const english = EVAL_SET.filter((x) => (x.lang ?? "en") === "en");
  const answerable = english.filter((x) => x.answerable);
  const unanswerable = english.filter((x) => !x.answerable);
  const arAnswerable = EVAL_SET.filter((x) => x.lang === "ar" && x.answerable).length;
  const arUnanswerable = EVAL_SET.filter((x) => x.lang === "ar" && !x.answerable).length;
  const ar = { hit: 0, falseAbstain: 0, trueAbstain: 0, e2eAnswered: 0, e2eAbstainOk: 0, e2eRuns: 0 };
  let hit = 0, falseAbstain = 0, trueAbstain = 0;
  let llmFallbacks = 0;
  let e2eAnswered = 0, e2eAbstainOk = 0, e2eExpectedCited = 0, sentences = 0, supported = 0, validCites = 0, e2eRuns = 0;

  const { groundedAnswer } = retrievalOnly ? { groundedAnswer: null } : await import("@/lib/rag/answer");

  for (const item of EVAL_SET) {
    const r = await retrieve(item.q, { audience: "both" });
    const ids = r.hits.map((h) => h.passage.id);
    const isHit = !r.abstain && (item.expect ?? []).some((e) => ids.includes(e));
    const isAr = item.lang === "ar";
    if (isAr) {
      if (item.answerable) {
        if (isHit) ar.hit++;
        if (r.abstain) ar.falseAbstain++;
      } else if (r.abstain) ar.trueAbstain++;
    } else if (item.answerable) {
      if (isHit) hit++;
      if (r.abstain) falseAbstain++;
    } else if (r.abstain) trueAbstain++;

    let e2e: GroundedAnswer | null = null;
    if (groundedAnswer) {
      e2e = await groundedAnswer(item.q, { audience: "patient", judge: true, locale: isAr ? "ar" : "en" });
      if (isAr) {
        ar.e2eRuns++;
        if (item.answerable && e2e.status === "answered") ar.e2eAnswered++;
        if (!item.answerable && e2e.status === "abstained") ar.e2eAbstainOk++;
        rows.push(rowFor(item, ids, r.abstain, isHit, e2e));
        process.stdout.write(`${r.abstain ? "·" : "✓"}${e2e.status === "answered" ? "A" : e2e.status === "abstained" ? "x" : "!"} `);
        await sleep(Number(process.env.RAG_EVAL_DELAY_MS ?? 6000));
        continue;
      }
      e2eRuns++;
      if (e2e.mode === "extractive") llmFallbacks++;
      provider = e2e.provider ?? provider;
      const checks = e2e.checks ?? [];
      sentences += checks.length;
      supported += checks.filter((c) => c.supported).length;
      validCites += checks.filter((c) => !c.issues.some((i) => i.startsWith("no citation") || i.startsWith("cites a passage"))).length;
      if (item.answerable && e2e.status === "answered") {
        e2eAnswered++;
        if (e2e.sentences.some((s) => s.cites.some((c) => (item.expect ?? []).includes(c)))) e2eExpectedCited++;
      }
      if (!item.answerable && e2e.status === "abstained") e2eAbstainOk++;
      await sleep(Number(process.env.RAG_EVAL_DELAY_MS ?? 6000)); // stay under free-tier rate limits
    }
    rows.push(rowFor(item, ids, r.abstain, isHit, e2e));
    process.stdout.write(`${r.abstain ? "·" : "✓"}${e2e ? (e2e.status === "answered" ? "A" : e2e.status === "abstained" ? "x" : "!") : ""} `);
  }
  process.stdout.write("\n");

  const result = {
    generatedAt: new Date().toISOString(),
    corpus: {
      passages: PASSAGES.length,
      byStatus: PASSAGES.reduce<Record<string, number>>((acc, p) => ({ ...acc, [p.status]: (acc[p.status] ?? 0) + 1 }), {})
    },
    questions: { total: english.length, answerable: answerable.length, unanswerable: unanswerable.length },
    byLanguage: {
      ar: {
        questions: { answerable: arAnswerable, unanswerable: arUnanswerable },
        retrieval: {
          hitAt4: wilson(ar.hit, arAnswerable),
          falseAbstention: wilson(ar.falseAbstain, arAnswerable),
          correctAbstention: wilson(ar.trueAbstain, arUnanswerable)
        },
        endToEnd: ar.e2eRuns > 0 ? { answered: wilson(ar.e2eAnswered, arAnswerable), correctAbstention: wilson(ar.e2eAbstainOk, arUnanswerable) } : null
      }
    },
    thresholds: { minScore: MIN_SCORE, minCoverage: MIN_COVERAGE },
    retrieval: {
      hitAt4: wilson(hit, answerable.length),
      falseAbstention: wilson(falseAbstain, answerable.length),
      correctAbstention: wilson(trueAbstain, unanswerable.length)
    },
    endToEnd:
      e2eRuns > 0
        ? {
            provider,
            judge: true,
            llmFallbacks,
            answered: wilson(e2eAnswered, answerable.length),
            correctAbstention: wilson(e2eAbstainOk, unanswerable.length),
            expectedSourceCited: wilson(e2eExpectedCited, e2eAnswered),
            citationValidity: wilson(validCites, sentences),
            supportedSentences: wilson(supported, sentences)
          }
        : null,
    caveats: [
      "Questions were written by the ReproAI team, not collected from patients or clinicians.",
      "Headline figures are for English questions. The guidance corpus is English only; Arabic questions are mapped to English corpus terms at retrieval time (src/lib/rag/arabic.ts) and reported separately.",
      "Abstention thresholds were tuned on this same set, so retrieval figures are optimistic.",
      "End-to-end figures depend on the LLM provider and model and vary between runs.",
      "Sentence support is checked automatically (numbers, wording, quotes, LLM judge); it has not been reviewed by clinicians."
    ],
    rows
  };
  const out = join(process.cwd(), "src/lib/rag/eval-results.json");
  writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
  const pct = (p: P) => (p.rate === null ? "n/a" : `${Math.round(p.rate * 100)}% (${p.numerator}/${p.denominator})`);
  console.log(`Retrieval hit@4 ${pct(result.retrieval.hitAt4)} · false abstention ${pct(result.retrieval.falseAbstention)} · correct abstention ${pct(result.retrieval.correctAbstention)}`);
  if (result.endToEnd) {
    const e = result.endToEnd;
    console.log(`End-to-end (${e.provider}): answered ${pct(e.answered)} · correct abstention ${pct(e.correctAbstention)} · expected source cited ${pct(e.expectedSourceCited)} · citation validity ${pct(e.citationValidity)} · supported sentences ${pct(e.supportedSentences)} · LLM fallbacks ${e.llmFallbacks}`);
  }
  const a = result.byLanguage.ar;
  console.log(`Arabic: retrieval hit@4 ${pct(a.retrieval.hitAt4)} · false abstention ${pct(a.retrieval.falseAbstention)} · correct abstention ${pct(a.retrieval.correctAbstention)}${a.endToEnd ? ` · answered ${pct(a.endToEnd.answered)} · correct abstention ${pct(a.endToEnd.correctAbstention)}` : ""}`);
  console.log(`Wrote ${out}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
