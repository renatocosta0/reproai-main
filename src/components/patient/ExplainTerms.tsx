"use client";

import type { ReactNode } from "react";
import { useAsk } from "@/components/patient/AskPanel";

/**
 * Tap-to-explain: known medical terms inside a sentence become buttons that open the
 * Ask panel with a question about that term. The explanation itself comes from the
 * cited assistant (src/lib/rag/answer.ts); no definitions are written here.
 */
const TERMS: { match: RegExp; title: string; questions: string[] }[] = [
  { match: /\bAMH\b/, title: "AMH (anti-Müllerian hormone)", questions: ["What is AMH?", "Does AMH tell me whether I can get pregnant?"] },
  { match: /\bantral follicle count\b/i, title: "Antral follicle count", questions: ["What is an antral follicle count?"] },
  { match: /\bovulation\b/i, title: "Ovulation", questions: ["What does a rise in basal body temperature mean?", "Can basal body temperature confirm ovulation?"] },
  { match: /\begg reserve\b|\bovarian reserve\b/i, title: "Egg (ovarian) reserve", questions: ["What is ovarian reserve?", "What does my AMH result mean?"] },
  { match: /\begg freezing\b/i, title: "Egg freezing", questions: ["Who can have social egg freezing under Thiqa?", "Does egg freezing work better at younger ages?"] },
  { match: /\bsperm concentration\b|\bsperm count\b/i, title: "Sperm concentration", questions: ["Is my sperm concentration in the normal range?", "What lifestyle changes does WHO recommend?"] },
  { match: /\breference limit\b|\breference value/i, title: "Reference limits", questions: ["What is a reference limit for a lab result?"] }
];

export function ExplainTerms({ text }: { text: string }) {
  const open = useAsk();
  if (!open || !text) return <>{text}</>;

  // Find the first occurrence of each term, in order of position, without overlaps.
  const hits = TERMS.map((t) => {
    const m = t.match.exec(text);
    return m ? { start: m.index, end: m.index + m[0].length, word: m[0], term: t } : null;
  })
    .filter((h): h is NonNullable<typeof h> => h !== null)
    .sort((a, b) => a.start - b.start)
    .filter((h, i, all) => i === 0 || h.start >= all[i - 1].end);

  if (hits.length === 0) return <>{text}</>;
  const out: ReactNode[] = [];
  let pos = 0;
  hits.forEach((h, i) => {
    if (h.start > pos) out.push(text.slice(pos, h.start));
    out.push(
      <button key={i} type="button" className="term" onClick={() => open({ title: h.term.title, questions: h.term.questions })}>
        {h.word}
      </button>
    );
    pos = h.end;
  });
  if (pos < text.length) out.push(text.slice(pos));
  // One inline element, so flex parents keep the sentence on one line.
  return <span className="explained">{out}</span>;
}
