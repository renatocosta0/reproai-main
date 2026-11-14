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
    title: "Earlier, clearer reproductive-health decisions, with the clinician in control.",
    lead:
      "ReproAI gives health systems and clinicians one honest view of reproductive potential over time: verified lab results, cycle and wearable signals and a short history, with cited next steps. Every result is reviewed by a clinician before the person sees it.",
    ctaDemo: "Explore the demo",
    ctaTour: "Take the guided tour",
    invite: "Patients join through their clinic's invitation. There is no open sign-up.",
    howTitle: "How it works",
    howLead: "For health systems and clinicians, from the first invitation to the next decision.",
    steps: [
      { title: "Invite people earlier", text: "A clinic prescribes ReproAI with a secure link. Invitations through premarital screening and IFHAS adult screening are proposed for production." },
      { title: "Build one record over time", text: "Verified lab results with their source and date, cycle and sleep signals, and a short self-reported history, combined only with consent." },
      { title: "Calculate, never guess", text: "The model runs only when the required results are present; otherwise it names what is missing. Each estimate carries its 95% interval and the factors behind it." },
      { title: "The clinician reviews and releases", text: "Every result is a draft until a clinician writes a note and releases it. Options come from cited Daman Thiqa and WHO rules." },
      { title: "Follow up and measure", text: "A follow-up board, population insight on who would benefit from earlier advice, and measures of earlier action with their intervals." }
    ],
    personTitle: "For individuals and couples",
    personSteps: [
      { title: "Joined through your clinic", text: "There is no open sign-up. Your clinic sends a secure link, and partners pair only if both agree." },
      { title: "You decide who sees what", text: "Five separate consents, each changeable at any time and enforced by the system." },
      { title: "A trajectory, not a score", text: "Plain-language results in English or Arabic, how they have changed, your clinician's note and cited options to discuss." }
    ],
    coverage: "See what runs in the demo, what is simulated and what is proposed",
    askLink: "Have a general question? Ask the guidance assistant, no account needed",
    navAsk: "Ask a question",
    whoTitle: "Who it's for",
    who: [
      { title: "Women", text: "Ovarian reserve (AMH, antral follicle count) over time, cycle and basal temperature patterns, and egg-freezing options." },
      { title: "Men", text: "Semen parameters against WHO reference limits, lifestyle and sleep, and sperm-banking options." },
      { title: "Couples", text: "A joint view when both partners agree, with each person's data still under their own control." },
      { title: "Clinicians", text: "Your panel only: records with provenance, drafts to review, a follow-up board, population insight and a copilot that cites its sources." }
    ],
    safetyTitle: "Safety by design",
    safetyLead: "What ReproAI will not do.",
    modelCard: "Read the model card: what the model is, what it is not for, and its limitations",
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
    title: "قرارات أبكر وأوضح في الصحة الإنجابية، والقرار للطبيب.",
    lead:
      "يمنح ReproAI الأنظمة الصحية والأطباء رؤية صادقة للإمكانات الإنجابية عبر الزمن: نتائج مختبر موثّقة، وإشارات الدورة والأجهزة القابلة للارتداء، وتاريخاً صحياً موجزاً، مع خطوات تالية موثّقة المصادر. يراجع الطبيب كل نتيجة قبل أن يراها الشخص.",
    ctaDemo: "استكشف العرض التوضيحي",
    ctaTour: "ابدأ الجولة الإرشادية",
    invite: "ينضم المرضى عبر دعوة من عيادتهم. لا يوجد تسجيل مفتوح.",
    howTitle: "كيف يعمل",
    howLead: "للأنظمة الصحية والأطباء، من الدعوة الأولى حتى القرار التالي.",
    steps: [
      { title: "دعوة الناس في وقت أبكر", text: "تصف العيادة ReproAI عبر رابط آمن. والدعوات عبر فحص ما قبل الزواج وبرنامج الفحص الشامل للبالغين مقترحة لمرحلة الإنتاج." },
      { title: "سجل واحد يتكوّن مع الوقت", text: "نتائج مختبر موثّقة بمصدرها وتاريخها، وإشارات الدورة والنوم، وتاريخ صحي موجز يُدخله الشخص، ولا تُجمع إلا بموافقته." },
      { title: "حساب بلا تخمين", text: "لا يعمل النموذج إلا عند توفر النتائج المطلوبة، وإلا فإنه يحدد ما ينقص. ويأتي كل تقدير مع نطاقه بنسبة 95% والعوامل المؤثرة فيه." },
      { title: "الطبيب يراجع ويعتمد", text: "تبقى كل نتيجة مسودة حتى يكتب الطبيب ملاحظته ويعتمدها. وتستند الخيارات إلى قواعد موثّقة من دليل ضمان ثقة ومنظمة الصحة العالمية." },
      { title: "المتابعة والقياس", text: "لوحة متابعة، ورؤى على مستوى السكان حول من يستفيد من المشورة المبكرة، ومقاييس للتدخل المبكر مع نطاقاتها." }
    ],
    personTitle: "للأفراد والأزواج",
    personSteps: [
      { title: "الانضمام عبر عيادتك", text: "لا يوجد تسجيل مفتوح. ترسل عيادتك رابطاً آمناً، ولا يرتبط الشريكان إلا بموافقة كليهما." },
      { title: "أنت تقرر من يرى ماذا", text: "خمس موافقات منفصلة، يمكن تغيير كل منها في أي وقت، ويطبّقها النظام فعلياً." },
      { title: "مسار عبر الزمن لا درجة", text: "نتائج بلغة واضحة بالعربية أو الإنجليزية، وكيف تغيّرت، وملاحظة طبيبك، وخيارات موثّقة المصادر للنقاش." }
    ],
    coverage: "اطّلع على ما يعمل في العرض التوضيحي وما هو محاكى وما هو مقترح",
    askLink: "لديك سؤال عام؟ اسأل مساعد الإرشادات دون الحاجة إلى حساب",
    navAsk: "اطرح سؤالاً",
    whoTitle: "لمن صُمّم",
    who: [
      { title: "النساء", text: "مخزون المبيض (AMH وعدد الجريبات الغارية) عبر الزمن، وأنماط الدورة ودرجة الحرارة الأساسية، وخيارات تجميد البويضات." },
      { title: "الرجال", text: "مؤشرات السائل المنوي مقارنة بالحدود المرجعية لمنظمة الصحة العالمية، ونمط الحياة والنوم، وخيارات حفظ الحيوانات المنوية." },
      { title: "الأزواج", text: "عرض مشترك عند موافقة الشريكين، مع بقاء بيانات كل شخص تحت تصرفه." },
      { title: "الأطباء", text: "مرضاك فقط: سجلات موثّقة المصدر، ومسودات للمراجعة، ولوحة متابعة، ورؤى على مستوى السكان، ومساعد يذكر مصادره." }
    ],
    safetyTitle: "السلامة في صميم التصميم",
    safetyLead: "ما لن يفعله ReproAI.",
    modelCard: "اقرأ بطاقة النموذج: ما هو النموذج، وما لا يُستخدم له، وحدوده",
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

const STEP_ICONS: LucideIcon[] = [UserRoundPlus, Watch, LineChart, ClipboardCheck, Stethoscope];
const PERSON_ICONS: LucideIcon[] = [HeartHandshake, FileLock2, BookOpenCheck];
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
          <Link href="/ask">{t.navAsk}</Link>
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
          <h3 className="landing-subhead">{t.personTitle}</h3>
          <div className="landing-grid three">
            {t.personSteps.map((p, i) => {
              const Icon = PERSON_ICONS[i];
              return (
                <article key={p.title} className="landing-card">
                  <Icon size={20} aria-hidden />
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </article>
              );
            })}
          </div>
          <p className="landing-coverage">
            <Link href="/ask">
              {t.askLink} <ArrowRight size={15} aria-hidden className="flip-rtl" />
            </Link>
          </p>
          <p className="landing-coverage">
            <Link href="/coverage">
              {t.coverage} <ArrowRight size={15} aria-hidden className="flip-rtl" />
            </Link>
          </p>
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
          <p className="landing-more">
            <Link href="/model-card">
              {t.modelCard} <ArrowRight size={15} aria-hidden className="flip-rtl" />
            </Link>
          </p>
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
