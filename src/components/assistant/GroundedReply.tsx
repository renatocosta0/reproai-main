"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, ChevronDown, ExternalLink, FileText, Phone, SearchX, ShieldCheck } from "lucide-react";
import type { GroundedAnswer } from "@/lib/rag/answer";

const T = {
  en: {
    notFound: "Not in ReproAI's guidance",
    notFoundBody: "I couldn't find this in the guidance library or your record, so I won't guess. Your clinician is the best person to ask.",
    notFoundClin: "No passage in the guidance library or the case record supports an answer. Nothing was generated.",
    sources: (n: number) => `${n} source${n === 1 ? "" : "s"}`,
    checked: "Every sentence checked against its source",
    removed: (n: number) => `${n} sentence${n === 1 ? "" : "s"} removed: not supported by the sources`,
    flagged: (n: number) => `${n} sentence${n === 1 ? "" : "s"} flagged: check against the source`,
    extractive: "Shown as written in the source",
    record: "Your record",
    urgent: "Urgent",
    closest: "Closest passages (not used)",
    sourceN: (n: number) => `Source ${n}`,
    open: "Open"
  },
  ar: {
    notFound: "غير موجود في إرشادات ReproAI",
    notFoundBody: "لم أجد هذا في مكتبة الإرشادات أو في سجلك، لذلك لن أخمّن. طبيبك هو أفضل من تسأله.",
    notFoundClin: "لا يوجد مقطع في مكتبة الإرشادات أو في سجل الحالة يدعم إجابة، ولم يُولَّد أي نص.",
    sources: (n: number) => (n === 1 ? "مصدر واحد" : n === 2 ? "مصدران" : n % 100 >= 3 && n % 100 <= 10 ? `${n} مصادر` : `${n} مصدرًا`),
    checked: "تم التحقق من كل جملة مقابل مصدرها",
    removed: (n: number) => `حُذفت ${n} جملة لأنها غير مدعومة بالمصادر`,
    flagged: (n: number) => `جمل مُعلَّمة: ${n} — تحقّق منها مقابل المصدر`,
    extractive: "معروض كما ورد في المصدر",
    record: "سجلك",
    urgent: "عاجل",
    closest: "أقرب المقاطع (لم تُستخدم)",
    sourceN: (n: number) => `المصدر ${n}`,
    open: "فتح"
  }
};

export function GroundedReply({ answer, audience, locale = "en" }: { answer: GroundedAnswer; audience: "patient" | "clinician"; locale?: "en" | "ar" }) {
  const t = T[locale];
  const [open, setOpen] = useState(audience === "clinician");
  const order = answer.sources.map((s) => s.id);
  const num = (id: string) => order.indexOf(id) + 1;

  if (answer.status === "urgent") {
    return (
      <div className="grounded urgent" role="alert">
        <span className="tool-badge warn"><Phone size={12} /> {t.urgent}</span>
        <p>{answer.sentences[0]?.text}</p>
      </div>
    );
  }

  if (answer.status === "abstained") {
    return (
      <div className="grounded abstained">
        <span className="abstain-title"><SearchX size={15} /> {t.notFound}</span>
        <p>{audience === "patient" ? t.notFoundBody : t.notFoundClin}</p>
        {answer.note && audience === "clinician" && <small className="muted-note">{answer.note}{answer.retrieval.reason ? ` ${answer.retrieval.reason}` : ""}</small>}
        {answer.sources.length > 0 && audience === "clinician" && <SourceList answer={answer} num={num} title={t.closest} t={t} />}
      </div>
    );
  }

  return (
    <div className="grounded">
      <div className="tool-badges">
        {answer.mode === "extractive" ? (
          <span className="tool-badge"><BookOpen size={12} /> {t.extractive}</span>
        ) : answer.flagged > 0 ? (
          <span className="tool-badge warn"><AlertTriangle size={12} /> {t.flagged(answer.flagged)}</span>
        ) : (
          <span className="tool-badge"><ShieldCheck size={12} /> {t.checked}</span>
        )}
        {answer.removed > 0 && <span className="tool-badge muted">{t.removed(answer.removed)}</span>}
      </div>
      <p className="reply-text grounded-text" dir="auto">
        {answer.sentences.map((s, i) => (
          <span key={i} className={s.supported ? undefined : "unsupported"} title={s.supported ? undefined : s.issues.join("; ")}>
            {s.text}
            {s.cites.map((c) => (
              <sup key={c} className="cite-chip" aria-label={t.sourceN(num(c))}>{num(c)}</sup>
            ))}
            {!s.supported && <AlertTriangle size={12} className="unsupported-icon" aria-label={s.issues.join("; ")} />}{" "}
          </span>
        ))}
      </p>
      {answer.note && <small className="muted-note">{answer.note}</small>}
      {answer.sources.length > 0 && (
        <div className="sources-panel">
          <button type="button" className="sources-toggle" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
            <BookOpen size={13} /> {t.sources(answer.sources.length)} <ChevronDown size={13} className={open ? "rot" : undefined} />
          </button>
          {open && <SourceList answer={answer} num={num} t={t} />}
        </div>
      )}
    </div>
  );
}

function SourceList({ answer, num, title, t }: { answer: GroundedAnswer; num: (id: string) => number; title?: string; t: (typeof T)["en"] }) {
  return (
    <ol className="source-list">
      {title && <li className="source-list-title">{title}</li>}
      {answer.sources.map((s) => (
        <li key={s.id}>
          <span className="source-num">{num(s.id) || "·"}</span>
          <div>
            <strong>{s.kind === "record" ? <FileText size={12} /> : null} {s.title}</strong>
            <small>
              {s.label} · <code>{s.id}</code>
              {s.statusLabel && <> · <em>{s.statusLabel}</em></>}
              {s.url && s.url.startsWith("http") && (
                <> · <a href={s.url} target="_blank" rel="noopener noreferrer">{t.open} <ExternalLink size={10} /></a></>
              )}
            </small>
            <p dir="auto">{s.text}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}
