"use client";

// Public landing page: what ReproAI is, how a care journey works, and the
// safety rules it keeps, before anyone signs in. No numbers, testimonials or
// performance claims. There is no sign-up: patients join only through a
// clinician's invitation or a partner's pairing link.

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  ClipboardCheck,
  FileLock2,
  HeartHandshake,
  Languages,
  LineChart,
  PlayCircle,
  ShieldCheck,
  Stethoscope,
  UserRound,
  UserRoundPlus,
  Watch,
  type LucideIcon
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { useLocale } from "@/components/i18n/LocaleContext";

const STRINGS = {
  en: {
    navHow: "How it works",
    navWho: "Who it's for",
    navSafety: "Safety",
    signIn: "Sign in",
    lang: "العربية",
    eyebrow: "Reproductive health over time",
    title: "See reproductive health change over time, with your care team.",
    lead:
      "ReproAI brings lab results, cycle and wearable signals and a short history into one record. Clinicians review every result before it is shared, and explain what it means and what options to discuss.",
    ctaDemo: "Explore the demo",
    ctaTour: "Take the guided tour",
    invite: "Patients join through their clinic's invitation. There is no open sign-up.",
    howTitle: "How it works",
    howLead: "One record per person, or per couple, from the first visit to the next decision.",
    steps: [
      { title: "A clinician prescribes it", text: "Your clinic sends a secure activation link. Partners can pair later, and either can unpair at any time." },
      { title: "You choose who sees what", text: "Five separate consents, each changeable at any time and enforced by the system, not just shown on screen." },
      { title: "The record builds over time", text: "Verified lab results with their source and date, basal temperature and sleep, and a short self-reported history." },
      { title: "Your clinician reviews it", text: "If a required result is missing, no estimate is made. New assessments stay as drafts until a clinician signs them off." },
      { title: "You see what it means", text: "A plain-language result, how it has changed, your clinician's note, and cited options to discuss. Clinicians see the model estimate with its 95% interval." }
    ],
    whoTitle: "Who it's for",
    who: [
      { title: "Women", text: "Ovarian reserve (AMH, antral follicle count) over time, cycle and basal temperature patterns, and egg-freezing options." },
      { title: "Men", text: "Semen parameters against WHO reference limits, lifestyle and sleep, and sperm-banking options." },
      { title: "Couples", text: "A joint view when both partners agree, with each person's data still under their own control." },
      { title: "Clinicians", text: "Your panel only: records with provenance, drafts to review, a follow-up board, population insight and a copilot that cites its sources." }
    ],
    safetyTitle: "Safety by design",
    safetyLead: "What ReproAI will not do.",
    safety: [
      { title: "Guess missing data", text: "A missing required input stops the assessment and says what is needed." },
      { title: "Share results without sign-off", text: "Patients see only what a clinician has reviewed and released." },
      { title: "Answer without a source", text: "The assistants retrieve guidance first, cite a passage for every sentence, and say so when the guidance does not cover a question." },
      { title: "Hide who looked", text: "Access is scoped to each clinician's own patients, and every view and decision is audit-logged." }
    ],
    builtTitle: "Built to fit care in Abu Dhabi",
    built: [
      "English and Arabic, with right-to-left layout",
      "FHIR R4 export designed for exchange with Malaffi",
      "Options cite the Daman Thiqa ART guideline and WHO guidance"
    ],
    footer:
      "Prototype for the Abu Dhabi Future Health Digital Innovation Challenge (Challenge 02, Fertility). Not clinically validated and not a diagnostic device. Demo accounts use synthetic data."
  },
  ar: {
    navHow: "كيف يعمل",
    navWho: "لمن صُمّم",
    navSafety: "السلامة",
    signIn: "تسجيل الدخول",
    lang: "English",
    eyebrow: "الصحة الإنجابية عبر الزمن",
    title: "تابع تغيّر صحتك الإنجابية عبر الزمن، مع فريق رعايتك.",
    lead:
      "يجمع ReproAI نتائج المختبر وإشارات الدورة والأجهزة القابلة للارتداء وتاريخاً صحياً موجزاً في سجل واحد. يراجع الطبيب كل نتيجة قبل مشاركتها، ويوضح معناها والخيارات المتاحة للنقاش.",
    ctaDemo: "استكشف العرض التوضيحي",
    ctaTour: "ابدأ الجولة الإرشادية",
    invite: "ينضم المرضى عبر دعوة من عيادتهم. لا يوجد تسجيل مفتوح.",
    howTitle: "كيف يعمل",
    howLead: "سجل واحد لكل شخص أو لكل زوجين، من الزيارة الأولى حتى القرار التالي.",
    steps: [
      { title: "يصفه لك الطبيب", text: "ترسل عيادتك رابط تفعيل آمناً. يمكن للشريكين الربط لاحقاً، ويمكن لأي منهما إلغاء الربط في أي وقت." },
      { title: "أنت تختار من يرى ماذا", text: "خمس موافقات منفصلة، يمكن تغيير كل منها في أي وقت، ويطبّقها النظام فعلياً لا على الشاشة فقط." },
      { title: "يتكوّن السجل مع الوقت", text: "نتائج مختبر موثّقة بمصدرها وتاريخها، ودرجة حرارة الجسم الأساسية والنوم، وتاريخ صحي موجز يُدخله المريض." },
      { title: "يراجعه طبيبك", text: "إذا غابت نتيجة مطلوبة فلا يُحسب أي تقدير. وتبقى التقييمات الجديدة مسودات حتى يعتمدها الطبيب." },
      { title: "تفهم ما تعنيه النتيجة", text: "نتيجة بلغة واضحة، وكيف تغيّرت، وملاحظة طبيبك، وخيارات موثّقة المصادر للنقاش. يرى الأطباء تقدير النموذج مع نطاقه بنسبة 95%." }
    ],
    whoTitle: "لمن صُمّم",
    who: [
      { title: "النساء", text: "مخزون المبيض (AMH وعدد الجريبات الغارية) عبر الزمن، وأنماط الدورة ودرجة الحرارة الأساسية، وخيارات تجميد البويضات." },
      { title: "الرجال", text: "مؤشرات السائل المنوي مقارنة بالحدود المرجعية لمنظمة الصحة العالمية، ونمط الحياة والنوم، وخيارات حفظ الحيوانات المنوية." },
      { title: "الأزواج", text: "عرض مشترك عند موافقة الشريكين، مع بقاء بيانات كل شخص تحت تصرفه." },
      { title: "الأطباء", text: "مرضاك فقط: سجلات موثّقة المصدر، ومسودات للمراجعة، ولوحة متابعة، ورؤى على مستوى السكان، ومساعد يذكر مصادره." }
    ],
    safetyTitle: "السلامة في صميم التصميم",
    safetyLead: "ما لن يفعله ReproAI.",
    safety: [
      { title: "تخمين البيانات الناقصة", text: "غياب أي مُدخل مطلوب يوقف التقييم ويحدد ما ينقص." },
      { title: "مشاركة النتائج دون اعتماد", text: "لا يرى المرضى إلا ما راجعه الطبيب واعتمده." },
      { title: "الإجابة دون مصدر", text: "يبحث المساعدان في الإرشادات أولاً، ويذكران مصدراً لكل جملة، ويصرّحان عندما لا تغطي الإرشادات السؤال." },
      { title: "إخفاء من اطّلع على السجل", text: "يقتصر وصول كل طبيب على مرضاه، ويُسجَّل كل اطلاع وقرار في سجل التدقيق." }
    ],
    builtTitle: "مصمّم ليناسب الرعاية في أبوظبي",
    built: [
      "العربية والإنجليزية، مع تخطيط من اليمين إلى اليسار",
      "تصدير بصيغة FHIR R4 مصمّم للتبادل مع منصة ملفي",
      "الخيارات تستند إلى دليل ضمان ثقة للمساعدة على الإنجاب وإرشادات منظمة الصحة العالمية"
    ],
    footer:
      "نموذج أولي لتحدي أبوظبي للابتكار الرقمي في الصحة المستقبلية (التحدي 02، الخصوبة). لم يُتحقق منه سريرياً وليس جهازاً تشخيصياً. تستخدم حسابات العرض بيانات اصطناعية."
  }
} as const;

const STEP_ICONS: LucideIcon[] = [UserRoundPlus, FileLock2, Watch, ClipboardCheck, LineChart];
const WHO_ICONS: LucideIcon[] = [UserRound, UserRound, HeartHandshake, Stethoscope];

export function Landing({ demoEnabled }: { demoEnabled: boolean }) {
  const { locale, setLocale } = useLocale();
  const t = STRINGS[locale];

  return (
    <div className="landing">
      <header className="landing-nav">
        <Logo />
        <nav aria-label="Page sections">
          <a href="#how">{t.navHow}</a>
          <a href="#who">{t.navWho}</a>
          <a href="#safety">{t.navSafety}</a>
        </nav>
        <div className="landing-nav-actions">
          <button type="button" className="secondary" onClick={() => setLocale(locale === "ar" ? "en" : "ar")} lang={locale === "ar" ? "en" : "ar"}>
            <Languages size={15} aria-hidden /> {t.lang}
          </button>
          <Link className="primary compact" href="/login">
            {t.signIn} <ArrowRight size={15} aria-hidden className="flip-rtl" />
          </Link>
        </div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="eyebrow light">{t.eyebrow}</div>
          <h1>{t.title}</h1>
          <p>{t.lead}</p>
          <div className="landing-ctas">
            <Link className="primary" href="/login">
              {t.signIn} <ArrowRight size={16} aria-hidden className="flip-rtl" />
            </Link>
            {demoEnabled && (
              <>
                <Link className="secondary" href="/login#demo">
                  {t.ctaDemo}
                </Link>
                <Link className="landing-tour" href="/tour">
                  <PlayCircle size={16} aria-hidden /> {t.ctaTour}
                </Link>
              </>
            )}
          </div>
          <p className="landing-invite">
            <ShieldCheck size={15} aria-hidden /> {t.invite}
          </p>
        </section>

        <section id="how" className="landing-section">
          <h2>{t.howTitle}</h2>
          <p className="landing-lead">{t.howLead}</p>
          <ol className="landing-steps">
            {t.steps.map((s, i) => {
              const Icon = STEP_ICONS[i];
              return (
                <li key={s.title}>
                  <span className="landing-step-num">{i + 1}</span>
                  <Icon size={20} aria-hidden className="landing-step-icon" />
                  <h3>{s.title}</h3>
                  <p>{s.text}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section id="who" className="landing-section">
          <h2>{t.whoTitle}</h2>
          <div className="landing-grid">
            {t.who.map((w, i) => {
              const Icon = WHO_ICONS[i];
              return (
                <article key={w.title} className="landing-card">
                  <Icon size={20} aria-hidden />
                  <h3>{w.title}</h3>
                  <p>{w.text}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section id="safety" className="landing-section">
          <h2>{t.safetyTitle}</h2>
          <p className="landing-lead">{t.safetyLead}</p>
          <div className="landing-grid">
            {t.safety.map((s) => (
              <article key={s.title} className="landing-card safety">
                <ShieldCheck size={20} aria-hidden />
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="landing-section landing-built">
          <h2>{t.builtTitle}</h2>
          <ul>
            {t.built.map((b) => (
              <li key={b}>
                <BookOpenCheck size={16} aria-hidden /> {b}
              </li>
            ))}
          </ul>
        </section>
      </main>

      <footer className="landing-footer">
        <p>{t.footer}</p>
      </footer>
    </div>
  );
}
