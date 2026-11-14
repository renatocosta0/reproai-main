"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, Languages } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useLocale } from "@/components/i18n/LocaleContext";
import type { ModelInfo } from "@/lib/ml-client";

const UI = {
  en: {
    home: "Home",
    lang: "العربية",
    eyebrow: "Model card",
    fallbackName: "ReproAI scoring model",
    unreachable: "The model service is not reachable right now, so the model card cannot be shown. It is read live from the service so that it always describes the version in use.",
    version: "Version",
    evidence: "Evidence status",
    claims: "Performance claims",
    intendedUse: "Intended use",
    notFor: "Not for",
    meaning: "What the number means",
    how: "How it works",
    assessment: "Assessment",
    required: "Required (no estimate without them)",
    optional: "Optional",
    none: "None",
    scope: (k: string) => k.replace("INDIVIDUAL", "Individual").replace("COUPLE", "Couple"),
    missingLabel: "Missing data.",
    missingText: (effect: string) => `If a required input is missing, the service returns no estimate and names what is missing. Missing optional inputs: ${effect}.`,
    explain: "How it explains a result",
    uncertainty: "Uncertainty",
    sources: "Evidence sources",
    limits: "Known limitations",
    before: "Before clinical use",
    safeguards: "Safeguards around the model",
    safeguardList: [
      "Patients never see an estimate until a clinician has reviewed and released it, and then see a tier and percentile rather than the probability.",
      "Lab values are entered or verified by clinicians and carry their source and date; patients cannot write lab values.",
      "Every estimate is stored with the exact inputs and model version that produced it.",
      "The assistants never calculate estimates; they explain recorded and released information and cite their sources."
    ],
    evidenceNote: "Clinicians can see live panel measures, a labelled simulation and the assistant evaluation on the Evidence & safety page.",
    footer: "Prototype for the Abu Dhabi Future Health Digital Innovation Challenge (Challenge 02, Fertility). Not clinically validated and not a diagnostic device."
  },
  ar: {
    home: "الرئيسية",
    lang: "English",
    eyebrow: "بطاقة النموذج",
    fallbackName: "نموذج ReproAI للتقدير",
    unreachable: "خدمة النموذج غير متاحة حاليًا، لذا لا يمكن عرض بطاقة النموذج. تُقرأ البطاقة مباشرة من الخدمة لتصف دائمًا الإصدار المستخدم.",
    version: "الإصدار",
    evidence: "حالة الأدلة",
    claims: "ادعاءات الأداء",
    intendedUse: "الاستخدام المقصود",
    notFor: "لا يُستخدم من أجل",
    meaning: "ماذا يعني الرقم",
    how: "طريقة العمل",
    assessment: "التقييم",
    required: "مطلوب (لا تقدير بدونه)",
    optional: "اختياري",
    none: "لا يوجد",
    scope: (k: string) => k.replace("INDIVIDUAL / female", "فردي / أنثى").replace("INDIVIDUAL / male", "فردي / ذكر").replace("COUPLE", "زوجان"),
    missingLabel: "البيانات الناقصة.",
    missingText: (effect: string) => `إذا غاب مُدخل مطلوب، لا تُنتج الخدمة أي تقدير وتحدد ما ينقص. المُدخلات الاختيارية الناقصة: ${effect}.`,
    explain: "كيف يفسّر النتيجة",
    uncertainty: "عدم اليقين",
    sources: "مصادر الأدلة",
    limits: "الحدود المعروفة",
    before: "قبل الاستخدام السريري",
    safeguards: "الضمانات المحيطة بالنموذج",
    safeguardList: [
      "لا يرى المرضى أي تقدير قبل أن يراجعه الطبيب ويعتمده، ثم يرون فئة ونسبة مئوية بدل الاحتمال.",
      "يُدخل الأطباء قيم المختبر أو يتحققون منها، وتحمل مصدرها وتاريخها؛ ولا يمكن للمرضى إدخال قيم مخبرية.",
      "يُحفظ كل تقدير مع مُدخلاته الدقيقة وإصدار النموذج الذي أنتجه.",
      "لا يحسب المساعدان أي تقدير أبدًا؛ بل يشرحان المعلومات المسجّلة والمعتمدة ويذكران مصادرها."
    ],
    evidenceNote: "يمكن للأطباء رؤية مقاييس حية للوحة، ومحاكاة موسومة، وتقييم المساعد في صفحة الأدلة والسلامة.",
    footer: "نموذج أولي لتحدي أبوظبي للابتكار الرقمي في الصحة المستقبلية (التحدي 02، الخصوبة). لم يُتحقق منه سريريًا وليس جهازًا تشخيصيًا."
  }
};

export function ModelCardView({ info }: { info: ModelInfo | null }) {
  const { locale, setLocale } = useLocale();
  const ar = locale === "ar";
  const t = UI[locale];
  // Arabic text comes from the service too; fall back to English if an older service has none.
  const a = ar && info?.ar ? info.ar : null;

  return (
    <div className="landing model-card">
      <header className="landing-nav">
        <Link href="/" className="brand-home" aria-label="ReproAI home">
          <Logo />
        </Link>
        <div className="landing-nav-actions">
          <button type="button" className="secondary" onClick={() => setLocale(ar ? "en" : "ar")} lang={ar ? "en" : "ar"}>
            <Languages size={15} aria-hidden /> {t.lang}
          </button>
          <Link className="secondary" href="/">
            <ArrowLeft size={15} aria-hidden className="flip-rtl" /> {t.home}
          </Link>
        </div>
      </header>

      <main className="landing-section mc-body">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{a?.model_name ?? info?.model_name ?? t.fallbackName}</h1>

        {!info ? (
          <p className="mc-callout">{t.unreachable}</p>
        ) : (
          <>
            <dl className="mc-meta">
              <div><dt>{t.version}</dt><dd><code dir="ltr">{info.version}</code></dd></div>
              <div><dt>{t.evidence}</dt><dd>{a?.evidence_status ?? info.evidence_status}</dd></div>
              <div><dt>{t.claims}</dt><dd>{a?.performance_claims ?? info.performance_claims}</dd></div>
            </dl>

            <Section title={t.intendedUse}>
              <p>{a?.intended_use ?? info.intended_use}</p>
              {(a?.intended_users ?? info.intended_users)?.length ? <List items={(a?.intended_users ?? info.intended_users)!} /> : null}
            </Section>

            {(a?.out_of_scope ?? info.out_of_scope)?.length ? (
              <Section title={t.notFor}>
                <List items={(a?.out_of_scope ?? info.out_of_scope)!} />
              </Section>
            ) : null}

            {(a?.outcome ?? info.outcome) && (
              <Section title={t.meaning}>
                <p>{a?.outcome ?? info.outcome}</p>
              </Section>
            )}

            <Section title={t.how}>
              <p>{a ? a.architecture : `${info.architecture}.`}</p>
              {(a?.inputs ?? info.inputs) && (
                <table className="mc-table">
                  <thead>
                    <tr><th>{t.assessment}</th><th>{t.required}</th><th>{t.optional}</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries((a?.inputs ?? info.inputs)!).map(([k, v]) => (
                      <tr key={k}>
                        <td>{t.scope(k)}</td>
                        <td>{v.required.join(ar ? "، " : ", ")}</td>
                        <td>{v.optional.join(ar ? "، " : ", ") || t.none}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p>
                <strong>{t.missingLabel}</strong> {t.missingText(a?.optional_effect ?? info.missing_data_policy.optional_effect)}
              </p>
            </Section>

            {(a?.explanation_method ?? info.explanation_method) && (
              <Section title={t.explain}>
                <p>{a?.explanation_method ?? info.explanation_method}</p>
              </Section>
            )}

            {(a?.uncertainty ?? info.uncertainty) && (
              <Section title={t.uncertainty}>
                <p>{a?.uncertainty ?? info.uncertainty}</p>
              </Section>
            )}

            <Section title={t.sources}>
              <div lang="en" dir="ltr"><List items={info.evidence_sources} /></div>
            </Section>

            {(a?.known_limitations ?? info.known_limitations)?.length ? (
              <Section title={t.limits}>
                <List items={(a?.known_limitations ?? info.known_limitations)!} />
              </Section>
            ) : null}

            {(a?.next_steps ?? info.next_steps) && (
              <Section title={t.before}>
                <p>{a?.next_steps ?? info.next_steps}</p>
              </Section>
            )}

            <Section title={t.safeguards}>
              <List items={t.safeguardList} />
              <p className="mc-note">{t.evidenceNote}</p>
            </Section>
          </>
        )}
      </main>

      <footer className="landing-footer">
        <p>{t.footer}</p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mc-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}
