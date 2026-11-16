"use client";

// Demo coverage: for each Challenge 02 requirement, what runs in the prototype,
// what is simulated and what is proposed for production, with where to see it.
// Status statements only; no numbers, so nothing here is mocked data.

import Link from "next/link";
import { ArrowLeft, Languages } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { TourBar } from "@/components/tour/TourBar";
import { useLocale } from "@/components/i18n/LocaleContext";

type Status = "live" | "simulated" | "proposed";
type Text = { en: string; ar: string };

interface Row {
  status: Status;
  text: Text;
  where?: { label: Text; href: string };
}

interface Requirement {
  id: string;
  title: Text;
  ask: Text;
  rows: Row[];
}

const step = (n: string, extra?: { en: string; ar: string }) => ({
  en: `Tour step ${n}${extra ? ` (${extra.en})` : ""}`,
  ar: `الخطوة ${n} في الجولة${extra ? ` (${extra.ar})` : ""}`
});

const REQUIREMENTS: Requirement[] = [
  {
    id: "R1",
    title: { en: "A longitudinal view of reproductive potential", ar: "رؤية طولية للإمكانات الإنجابية" },
    ask: {
      en: "Combine only what the person shares, and show direction of change rather than a one-off label.",
      ar: "الجمع فقط بين ما يشاركه الشخص، وإظهار اتجاه التغيّر بدل تصنيف لمرة واحدة."
    },
    rows: [
      {
        status: "live",
        text: {
          en: "AMH, antral follicle count and semen parameters charted over time against reference limits and the person's first result, with direction-of-change wording.",
          ar: "هرمون AMH وعدد الجريبات الغارية ومؤشرات السائل المنوي على مخطط عبر الزمن مقابل الحدود المرجعية وأول نتيجة للشخص، مع وصف لاتجاه التغيّر."
        },
        where: { label: step("1", { en: "Nadia", ar: "نادية" }), href: "/tour" }
      },
      {
        status: "live",
        text: {
          en: "Basal temperature and sleep series, logged by the person, combined only with their consent.",
          ar: "سلاسل الحرارة الأساسية والنوم التي يسجّلها الشخص، ولا تُجمع إلا بموافقته."
        }
      },
      {
        status: "live",
        text: { en: "Estimate history for clinicians, always with its 95% interval.", ar: "سجل التقديرات للأطباء، دائمًا مع نطاقه بنسبة 95%." }
      },
      {
        status: "proposed",
        text: {
          en: "Verified lab results imported from Malaffi instead of entered by clinicians; certified device integrations.",
          ar: "استيراد نتائج المختبر الموثّقة من منصة ملفي بدل إدخالها يدويًا؛ وربط أجهزة معتمدة."
        }
      }
    ]
  },
  {
    id: "R2",
    title: { en: "Plain-language interpretation", ar: "تفسير بلغة واضحة" },
    ask: {
      en: "Say what is modifiable, what evidence supports the result, and where missing data or uncertainty limits it.",
      ar: "توضيح ما يمكن تعديله، والأدلة التي تدعم النتيجة، وأين تحدّ البيانات الناقصة أو عدم اليقين منها."
    },
    rows: [
      {
        status: "live",
        text: {
          en: "A missing required input (AMH or semen analysis) stops the assessment and names what is needed; nothing is guessed.",
          ar: "غياب مُدخل مطلوب (AMH أو تحليل السائل المنوي) يوقف التقييم ويحدد ما ينقص، ولا يُخمَّن شيء."
        },
        where: { label: step("5", { en: "Layla", ar: "ليلى" }), href: "/tour" }
      },
      {
        status: "live",
        text: { en: "Missing optional inputs widen the interval and show in a completeness meter.", ar: "غياب المُدخلات الاختيارية يوسّع النطاق ويظهر في مقياس الاكتمال." }
      },
      {
        status: "live",
        text: {
          en: "Factors that raised or lowered the estimate (exact Shapley values), modifiable vs fixed, provenance and date on every value, evidence-status labels.",
          ar: "العوامل التي رفعت التقدير أو خفّضته (قيم شابلي الدقيقة)، وما يمكن تعديله وما لا يمكن، ومصدر وتاريخ كل قيمة، وتسميات حالة الأدلة."
        }
      },
      {
        status: "live",
        text: { en: "English and Arabic with right-to-left layout, in both portals.", ar: "الإنجليزية والعربية مع تخطيط من اليمين إلى اليسار في البوابتين." },
        where: { label: step("9"), href: "/tour" }
      },
      {
        status: "live",
        text: {
          en: "Assistants that cite a source for every sentence and say \"not in ReproAI's guidance\" otherwise.",
          ar: "مساعدان يذكران مصدرًا لكل جملة، ويقولان «غير موجود في إرشادات ReproAI» عند عدم التغطية."
        },
        where: { label: step("4"), href: "/tour" }
      }
    ]
  },
  {
    id: "R3",
    title: { en: "Timely, personalised options", ar: "خيارات مخصّصة في الوقت المناسب" },
    ask: {
      en: "Turn findings into choices without prescribing beyond the intended use.",
      ar: "تحويل النتائج إلى خيارات دون تجاوز الاستخدام المقصود."
    },
    rows: [
      {
        status: "live",
        text: {
          en: "Deterministic rules with IDs and citations (Daman Thiqa ART guideline, WHO): red flags, referral by time trying and age, ovarian-reserve and semen testing, preservation discussion including the Thiqa social egg-freezing pathway, preconception counselling, weight, smoking, sleep.",
          ar: "قواعد ثابتة برموز ومصادر (دليل ضمان ثقة للمساعدة على الإنجاب، ومنظمة الصحة العالمية): علامات تحذيرية، والإحالة حسب مدة المحاولة والعمر، وفحص مخزون المبيض والسائل المنوي، ونقاش حفظ الخصوبة بما في ذلك مسار ثقة لتجميد البويضات الاجتماعي، والاستشارة قبل الحمل، والوزن، والتدخين، والنوم."
        },
        where: { label: { en: "Tour steps 1 and 9", ar: "الخطوتان 1 و9 في الجولة" }, href: "/tour" }
      },
      {
        status: "live",
        text: { en: "Every option states why it appears, its source and the intended-use boundary.", ar: "يذكر كل خيار سبب ظهوره ومصدره وحدود الاستخدام المقصود." }
      },
      {
        status: "live",
        text: {
          en: "What-if view limited to the one modifiable model input (BMI), labelled illustrative; nothing is saved.",
          ar: "عرض «ماذا لو» يقتصر على المُدخل الوحيد القابل للتعديل في النموذج (مؤشر كتلة الجسم)، موسوم بأنه توضيحي، ولا يُحفظ شيء."
        }
      }
    ]
  },
  {
    id: "R4",
    title: { en: "Clinician and system usefulness", ar: "فائدة للطبيب وللنظام الصحي" },
    ask: {
      en: "A concise clinician view and population-level insight, with decisions left to professionals.",
      ar: "عرض موجز للطبيب ورؤى على مستوى السكان، مع ترك القرارات للمختصين."
    },
    rows: [
      {
        status: "live",
        text: {
          en: "Clinicians see only the people they prescribed: a case record with verified labs, intake, triggered rules, history, a workflow strip, FHIR R4 export and a printable case report.",
          ar: "يرى الأطباء فقط من وصفوا لهم الخدمة: سجل حالة بنتائج مختبر موثّقة، والاستبيان، والقواعد المفعّلة، والتاريخ، وشريط سير العمل، وتصدير FHIR R4، وتقرير حالة قابل للطباعة."
        },
        where: { label: { en: "Tour steps 2 and 6", ar: "الخطوتان 2 و6 في الجولة" }, href: "/tour" }
      },
      {
        status: "live",
        text: {
          en: "Every model result is a draft until a clinician writes a note and releases it; a discard needs a reason.",
          ar: "تبقى كل نتيجة للنموذج مسودة حتى يكتب الطبيب ملاحظته ويعتمدها، ويتطلب الحذف ذكر السبب."
        }
      },
      {
        status: "live",
        text: {
          en: "Population insight: groups who would benefit from earlier advice, named for the clinician's own panel and anonymous service-wide with small groups suppressed.",
          ar: "رؤى على مستوى السكان: مجموعات تستفيد من المشورة المبكرة، بالأسماء لمرضى الطبيب نفسه، ومجهولة الهوية على مستوى الخدمة مع إخفاء الفئات الصغيرة."
        },
        where: { label: step("3"), href: "/tour" }
      },
      {
        status: "proposed",
        text: {
          en: "Invitations through premarital screening, IFHAS adult screening and TAMM; a system-level view across clinics.",
          ar: "الدعوات عبر فحص ما قبل الزواج وبرنامج الفحص الشامل للبالغين ومنصة تم؛ وعرض على مستوى النظام عبر العيادات."
        }
      }
    ]
  },
  {
    id: "R5",
    title: { en: "Privacy, non-discrimination and user control", ar: "الخصوصية وعدم التمييز وتحكم المستخدم" },
    ask: {
      en: "Granular, revocable consent, and no use for employment, insurance or unrelated decisions.",
      ar: "موافقة دقيقة وقابلة للسحب، وعدم الاستخدام في التوظيف أو التأمين أو قرارات غير ذات صلة."
    },
    rows: [
      {
        status: "live",
        text: {
          en: "Five separate consents (care-team access, lab results, wearables, partner sharing, anonymous statistics), changeable at any time, enforced in the API and audit-logged.",
          ar: "خمس موافقات منفصلة (اطلاع فريق الرعاية، ونتائج المختبر، والأجهزة القابلة للارتداء، والمشاركة مع الشريك، والإحصاءات المجهولة)، قابلة للتغيير في أي وقت، ويطبّقها النظام ويسجّلها."
        }
      },
      {
        status: "live",
        text: { en: "Withdrawing care-team access hides results and blocks assessments.", ar: "سحب إذن اطلاع فريق الرعاية يُخفي النتائج ويوقف التقييمات." },
        where: { label: step("5"), href: "/tour" }
      },
      {
        status: "live",
        text: {
          en: "Non-discrimination guarantee shown to patients; no open patient or clinician sign-up; partners pair only by mutual action.",
          ar: "يُعرض ضمان عدم التمييز على المرضى؛ ولا يوجد تسجيل مفتوح للمرضى أو الأطباء؛ ولا يرتبط الشريكان إلا بموافقة كليهما."
        }
      },
      {
        status: "proposed",
        text: {
          en: "UAE hosting, encryption at rest and multi-factor sign-in (required before real patient data).",
          ar: "الاستضافة داخل الإمارات، والتشفير أثناء التخزين، وتسجيل الدخول متعدد العوامل (مطلوبة قبل استخدام بيانات مرضى حقيقية)."
        }
      }
    ]
  },
  {
    id: "R6",
    title: { en: "Evidence of earlier action", ar: "أدلة على التدخل المبكر" },
    ask: {
      en: "Show time to counselling, referral completion and equitable reach, and report calibration and false-reassurance risks.",
      ar: "إظهار الوقت حتى الاستشارة، واستكمال الإحالات، وعدالة الوصول، والإبلاغ عن مخاطر المعايرة والطمأنة الزائفة."
    },
    rows: [
      {
        status: "live",
        text: {
          en: "Panel measures from the app's own records with Wilson 95% intervals: time from signal to appointment, referral follow-through, baseline coverage, review turnaround, by sex and age group.",
          ar: "مقاييس من سجلات التطبيق نفسه مع نطاقات ويلسون بنسبة 95%: الوقت من الإشارة إلى الموعد، ومتابعة الإحالات، وتغطية خط الأساس، وسرعة المراجعة، حسب الجنس والفئة العمرية."
        },
        where: { label: step("8"), href: "/tour" }
      },
      {
        status: "live",
        text: {
          en: "Assistant evaluation with every miss listed, including how Arabic questions are handled.",
          ar: "تقييم للمساعد مع سرد كل إخفاق، بما في ذلك طريقة التعامل مع الأسئلة العربية."
        }
      },
      {
        status: "simulated",
        text: {
          en: "Calibration and false reassurance of the reduced-reserve rule, on a labelled synthetic cohort.",
          ar: "المعايرة والطمأنة الزائفة لقاعدة انخفاض مخزون المبيض، على مجموعة اصطناعية موسومة."
        }
      },
      {
        status: "proposed",
        text: {
          en: "A six-month pilot measuring time to counselling, referral completion, informed-choice quality and equitable reach on real outcomes.",
          ar: "تجربة لمدة ستة أشهر تقيس الوقت حتى الاستشارة، واستكمال الإحالات، وجودة الاختيار المستنير، وعدالة الوصول على نتائج حقيقية."
        }
      }
    ]
  }
];

const AROUND: Row[] = [
  {
    status: "live",
    text: {
      en: "Numbers come only from the versioned model service; the language model explains and never calculates.",
      ar: "تأتي الأرقام فقط من خدمة النموذج ذات الإصدار المحدد؛ والنموذج اللغوي يشرح ولا يحسب أبدًا."
    }
  },
  {
    status: "live",
    text: {
      en: "Every estimate is stored with its exact inputs and model version; views and decisions are audit-logged.",
      ar: "يُحفظ كل تقدير مع مُدخلاته الدقيقة وإصدار النموذج؛ ويُسجَّل كل اطلاع وقرار في سجل التدقيق."
    }
  },
  {
    status: "live",
    text: {
      en: "Model card describing intended use, what the number means, explanations, uncertainty and limitations.",
      ar: "بطاقة نموذج تصف الاستخدام المقصود، ومعنى الرقم، والتفسيرات، وعدم اليقين، والحدود."
    },
    where: { label: { en: "Model card", ar: "بطاقة النموذج" }, href: "/model-card" }
  },
  { status: "simulated", text: { en: "All demo personas and records are synthetic.", ar: "جميع شخصيات العرض التوضيحي وسجلاته اصطناعية." } },
  {
    status: "proposed",
    text: {
      en: "Recalibration and external validation on Abu Dhabi outcomes before any clinical use.",
      ar: "إعادة المعايرة والتحقق الخارجي على نتائج من أبوظبي قبل أي استخدام سريري."
    }
  }
];

const UI = {
  en: {
    home: "Home",
    lang: "العربية",
    eyebrow: "Demo coverage",
    title: "What is working, what is simulated, what is proposed",
    lead: "For each requirement in the Challenge 02 brief, this page says what runs in the prototype today, what is simulated, and what is proposed for production, with where to see it in the guided tour.",
    statusKey: "Status key",
    status: { live: "Runs in prototype", simulated: "Simulated", proposed: "Proposed for production" } as Record<Status, string>,
    aroundTitle: "Around the model",
    aroundAsk: "How results are produced, traced and labelled.",
    footer: "Prototype for the Abu Dhabi Future Health Digital Innovation Challenge (Challenge 02, Fertility). Not clinically validated and not a diagnostic device."
  },
  ar: {
    home: "الرئيسية",
    lang: "English",
    eyebrow: "تغطية العرض التوضيحي",
    title: "ما يعمل، وما هو محاكى، وما هو مقترح",
    lead: "لكل متطلب في التحدي 02، توضح هذه الصفحة ما يعمل في النموذج الأولي اليوم، وما هو محاكى، وما هو مقترح لمرحلة الإنتاج، وأين يمكن رؤيته في الجولة الإرشادية.",
    statusKey: "دليل الحالات",
    status: { live: "يعمل في النموذج الأولي", simulated: "محاكى", proposed: "مقترح للإنتاج" } as Record<Status, string>,
    aroundTitle: "حول النموذج",
    aroundAsk: "كيف تُنتج النتائج وتُتتبَّع وتُوسم.",
    footer: "نموذج أولي لتحدي أبوظبي للابتكار الرقمي في الصحة المستقبلية (التحدي 02، الخصوبة). لم يُتحقق منه سريريًا وليس جهازًا تشخيصيًا."
  }
};

export function Coverage() {
  const { locale, setLocale } = useLocale();
  const ar = locale === "ar";
  const t = UI[locale];

  const rows = (list: Row[]) => (
    <ul className="cov-rows">
      {list.map((r) => (
        <li key={r.text.en}>
          <span className={`cov-status cov-${r.status}`}>{t.status[r.status]}</span>
          <p>
            {r.text[locale]}
            {r.where && (
              <>
                {" "}
                <Link href={r.where.href} className="cov-where">
                  {r.where.label[locale]}
                </Link>
              </>
            )}
          </p>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="landing cov">
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

      <main className="landing-section cov-body">
        <p className="eyebrow">{t.eyebrow}</p>
        <h1>{t.title}</h1>
        <p className="cov-lead">{t.lead}</p>
        <div className="cov-legend" aria-label={t.statusKey}>
          {(Object.keys(t.status) as Status[]).map((s) => (
            <span key={s} className={`cov-status cov-${s}`}>
              {t.status[s]}
            </span>
          ))}
        </div>

        {REQUIREMENTS.map((r) => (
          <section key={r.id} className="cov-req" aria-labelledby={`req-${r.id}`}>
            <div className="cov-req-head">
              <span className="cov-id">{r.id}</span>
              <div>
                <h2 id={`req-${r.id}`}>{r.title[locale]}</h2>
                <p>{r.ask[locale]}</p>
              </div>
            </div>
            {rows(r.rows)}
          </section>
        ))}

        <section className="cov-req" aria-labelledby="req-around">
          <div className="cov-req-head">
            <span className="cov-id">AI</span>
            <div>
              <h2 id="req-around">{t.aroundTitle}</h2>
              <p>{t.aroundAsk}</p>
            </div>
          </div>
          {rows(AROUND)}
        </section>
      </main>

      <footer className="landing-footer">
        <p>{t.footer}</p>
      </footer>
      {/* Public page: keep the guided-demo bar reachable while the tour is running (tour step: scope). */}
      <TourBar />
    </div>
  );
}
