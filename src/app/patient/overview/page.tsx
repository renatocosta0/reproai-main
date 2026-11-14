"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Droplets,
  HeartHandshake,
  MessageCircle,
  MoonStar,
  Scale,
  Sparkles,
  Thermometer
} from "lucide-react";
import { firstName, usePatient } from "@/components/patient/PatientContext";
import { useObservations } from "@/components/patient/useObservations";
import { percentileWords, useRecord } from "@/components/patient/useRecord";
import { ConfidenceBar, PotentialGauge } from "@/components/patient/PotentialGauge";
import { TemperatureChart } from "@/components/charts/TemperatureChart";
import { SleepChart } from "@/components/charts/SleepChart";
import { FormError } from "@/components/ui/Notice";
import { useLocale } from "@/components/i18n/LocaleContext";
import { percentileWordsAr, TIER_AR } from "@/lib/i18n";
import {
  analyzeBbt,
  formatHours,
  isSleep,
  isTemperature,
  isToday,
  MIN_BBT_READINGS,
  series,
  shortDate,
  sleepStats
} from "@/lib/observation-analysis";
import { tierCopy, WHO_SPERM_LOWER_LIMIT } from "@/lib/tiers";

const S = {
  en: {
    morning: "Good morning",
    afternoon: "Good afternoon",
    evening: "Good evening",
    loadError: "Could not load your profile.",
    subtitle: "Here is what your recorded data shows so far.",
    loadingInsight: "Loading your insight",
    insightEyebrow: "YOUR INSIGHT",
    aboutTitle: "Tell us a little about you",
    aboutDetail: "About three minutes; no lab results needed",
    tempLogged: "Morning temperature logged",
    logTemp: "Log your morning temperature",
    readingsNeeded: (n: number, of: number) => `${n} of ${of} readings needed to see your pattern`,
    readingsRecorded: (n: number) => `${n} readings recorded`,
    semenFromClinician: "Your semen analysis comes from your clinician",
    semenFromClinicianDetail: "Your clinician records it from the lab report",
    keepSleep: "Keep up 7+ hours of sleep",
    aimSleep: "Aim for 7+ hours of sleep",
    sleepAvg: (h: string, n: number) => `${h} average over ${n} nights`,
    startSleep: "Start logging sleep to see your average",
    linkPartnerStep: "Link with a partner (optional)",
    linkPartnerDetail: "Unlocks a joint estimate when you plan a pregnancy together",
    riseTitle: "Your temperature shows a clear rise",
    riseText: (s: string) => `A sustained rise of ${s}°C is consistent with ovulation. Keep logging so your care team can see your full pattern.`,
    riseLabel: "Post-rise shift",
    noRiseTitle: "No clear rise yet this cycle",
    noRiseText: "This is common and can vary from cycle to cycle. Your care team will look at it together with your other results.",
    buildTitle: "Build your temperature pattern",
    buildText: (n: number) => `Log your temperature each morning before getting up. After ${n} readings we can show whether a rise appears.`,
    buildLabel: "Readings so far",
    semenInRange: "Your semen analysis is within range",
    semenDiscuss: "Your sperm count is worth discussing",
    semenAboveText: (v: number, lim: number) => `${v} million/mL is above the WHO lower reference limit of ${lim} million/mL. Sleep, weight and activity help keep it there.`,
    semenBelowText: (v: number, lim: number) => `${v} million/mL is below the WHO reference of ${lim} million/mL. This is common, often improves with lifestyle changes, and your clinician can advise.`,
    millionPerMl: "million/mL",
    semenPendingText: "When your clinician records your semen analysis, you will see how it compares with WHO reference values.",
    welcomeTitle: "Welcome to ReproAI",
    welcomeText: "Once your clinician has reviewed your results, a personalised view of your reproductive health appears here.",
    viewTrajectory: "View my trajectory",
    explorePattern: "Explore your pattern",
    jointEstimate: "Your joint estimate",
    reproPicture: "Your reproductive picture",
    reviewedOn: (d: string) => `Reviewed by your clinician · ${d}`,
    notAssessed: "Not assessed yet",
    reviewedLatest: "Your clinician has reviewed your latest results.",
    amhIs: (w: string) => `Your AMH is ${w}.`,
    estimateNote: "An estimate to discuss with your care team, not a diagnosis.",
    pendingTitle: "A result is with your clinician",
    pendingText: "You will see it here once they have reviewed it and added a note for you.",
    baselineTitle: "Your baseline comes from your clinician",
    baselineText: "When your clinician records results such as an AMH test or a semen analysis and reviews them, your picture appears here.",
    nextSteps: "Your next best steps",
    nextStepsSub: "Based on what you have recorded",
    signals: "Your health signals",
    signalsFemale: "Basal body temperature and sleep",
    signalsMale: "Sleep, lifestyle and lab markers",
    viewDetails: "View details",
    noTempTitle: "No temperature readings yet",
    noTempText: "Your temperature chart appears here once you log at least two morning readings.",
    habitsTitle: "Track the habits that matter",
    habitsText: "Sleep, weight and activity influence sperm quality. Log your sleep to see trends here.",
    logMeasurement: "Log a measurement",
    tempToday: "Temperature today",
    latestTemp: "Latest temperature",
    notLogged: "Not logged",
    spermConc: "Sperm concentration",
    notRecorded: "Not recorded",
    inRange: "In range",
    belowRef: "Below ref.",
    sleepLast: "Sleep last logged",
    good: "Good",
    below7: "Below 7h",
    cycle: "Cycle regularity",
    bmi: "Body mass index",
    bmiTarget: "Target 20–24.9",
    cycleValue: { REGULAR: "Regular", IRREGULAR: "Irregular", AMENORRHEA: "Absent" } as Record<string, string>,
    planningTitle: "Planning a pregnancy together?",
    planningText: "Link with your partner for a joint estimate. Your own records stay private, and you can unlink any time.",
    linkPartner: "Link partner",
    linkedWith: (n: string) => `Linked with ${n}`,
    linkedText: "You can run a joint assessment that combines both partners' clinical factors.",
    jointAssessment: "Joint assessment",
    questionTitle: "Have a question about your journey?",
    questionText: "ReproAI answers from cited Daman Thiqa and WHO guidance and your released record, with your clinician in the loop.",
    askReproai: "Ask ReproAI"
  },
  ar: {
    morning: "صباح الخير",
    afternoon: "مساء الخير",
    evening: "مساء الخير",
    loadError: "تعذّر تحميل ملفك الشخصي.",
    subtitle: "هذا ما تُظهره بياناتك المسجّلة حتى الآن.",
    loadingInsight: "جارٍ تحميل ملخصك",
    insightEyebrow: "ملخصك",
    aboutTitle: "أخبرنا قليلًا عن نفسك",
    aboutDetail: "نحو ثلاث دقائق، دون الحاجة إلى نتائج مختبر",
    tempLogged: "سُجّلت درجة حرارة الصباح",
    logTemp: "سجّل درجة حرارتك الصباحية",
    readingsNeeded: (n: number, of: number) => `القراءات المسجّلة: ${n} من ${of} لازمة لإظهار نمطك`,
    readingsRecorded: (n: number) => `القراءات المسجّلة: ${n}`,
    semenFromClinician: "تحليل السائل المنوي يسجّله طبيبك",
    semenFromClinicianDetail: "يسجّله طبيبك من تقرير المختبر",
    keepSleep: "حافظ على النوم ٧ ساعات أو أكثر",
    aimSleep: "احرص على النوم ٧ ساعات أو أكثر",
    sleepAvg: (h: string, n: number) => `متوسط ${h} على مدى ليالٍ عددها ${n}`,
    startSleep: "ابدأ بتسجيل نومك لترى متوسطه",
    linkPartnerStep: "الارتباط بالشريك (اختياري)",
    linkPartnerDetail: "يتيح تقديرًا مشتركًا عند التخطيط للحمل معًا",
    riseTitle: "تُظهر حرارتك ارتفاعًا واضحًا",
    riseText: (s: string) => `ارتفاع مستمر بمقدار ${s}°م يتوافق مع حدوث الإباضة. واصل التسجيل ليرى فريق رعايتك نمطك كاملًا.`,
    riseLabel: "مقدار الارتفاع",
    noRiseTitle: "لا يوجد ارتفاع واضح في هذه الدورة بعد",
    noRiseText: "هذا شائع وقد يختلف من دورة إلى أخرى. سينظر فريق رعايتك فيه مع نتائجك الأخرى.",
    buildTitle: "ابنِ نمط حرارتك",
    buildText: (n: number) => `سجّل حرارتك كل صباح قبل النهوض. بعد ${n} قراءة يمكننا إظهار ما إذا كان هناك ارتفاع.`,
    buildLabel: "القراءات حتى الآن",
    semenInRange: "تحليل السائل المنوي ضمن النطاق",
    semenDiscuss: "عدد الحيوانات المنوية يستحق النقاش",
    semenAboveText: (v: number, lim: number) => `${v} مليون/مل أعلى من الحد المرجعي الأدنى لمنظمة الصحة العالمية (${lim} مليون/مل). يساعد النوم والوزن والنشاط على الحفاظ عليه.`,
    semenBelowText: (v: number, lim: number) => `${v} مليون/مل أقل من الحد المرجعي لمنظمة الصحة العالمية (${lim} مليون/مل). هذا شائع، وغالبًا ما يتحسن بتغيير نمط الحياة، ويمكن لطبيبك أن ينصحك.`,
    millionPerMl: "مليون/مل",
    semenPendingText: "عندما يسجّل طبيبك تحليل السائل المنوي، سترى كيف يقارن بالقيم المرجعية لمنظمة الصحة العالمية.",
    welcomeTitle: "مرحبًا بك في ReproAI",
    welcomeText: "بعد أن يراجع طبيبك نتائجك، ستظهر هنا صورة مخصصة لصحتك الإنجابية.",
    viewTrajectory: "عرض مساري",
    explorePattern: "استكشف نمطك",
    jointEstimate: "تقديركما المشترك",
    reproPicture: "صورتك الإنجابية",
    reviewedOn: (d: string) => `راجعها طبيبك · ${d}`,
    notAssessed: "لم يُقيَّم بعد",
    reviewedLatest: "راجع طبيبك أحدث نتائجك.",
    amhIs: (w: string) => `هرمون AMH لديك ${w}.`,
    estimateNote: "تقدير للنقاش مع فريق رعايتك، وليس تشخيصًا.",
    pendingTitle: "توجد نتيجة لدى طبيبك",
    pendingText: "ستظهر هنا بعد أن يراجعها ويضيف ملاحظة لك.",
    baselineTitle: "خط الأساس يأتي من طبيبك",
    baselineText: "عندما يسجّل طبيبك نتائج مثل فحص AMH أو تحليل السائل المنوي ويراجعها، تظهر صورتك هنا.",
    nextSteps: "خطواتك التالية",
    nextStepsSub: "بناءً على ما سجّلته",
    signals: "مؤشراتك الصحية",
    signalsFemale: "درجة حرارة الجسم الأساسية والنوم",
    signalsMale: "النوم ونمط الحياة والمؤشرات المخبرية",
    viewDetails: "عرض التفاصيل",
    noTempTitle: "لا توجد قراءات حرارة بعد",
    noTempText: "يظهر مخطط الحرارة هنا بعد تسجيل قراءتين صباحيتين على الأقل.",
    habitsTitle: "تابع العادات المهمة",
    habitsText: "يؤثر النوم والوزن والنشاط في جودة الحيوانات المنوية. سجّل نومك لترى الاتجاهات هنا.",
    logMeasurement: "سجّل قياسًا",
    tempToday: "حرارة اليوم",
    latestTemp: "آخر قراءة حرارة",
    notLogged: "غير مسجّل",
    spermConc: "تركيز الحيوانات المنوية",
    notRecorded: "غير مسجّل",
    inRange: "ضمن النطاق",
    belowRef: "أقل من المرجع",
    sleepLast: "آخر نوم مسجّل",
    good: "جيد",
    below7: "أقل من ٧ ساعات",
    cycle: "انتظام الدورة",
    bmi: "مؤشر كتلة الجسم",
    bmiTarget: "الهدف ٢٠–٢٤٫٩",
    cycleValue: { REGULAR: "منتظمة", IRREGULAR: "غير منتظمة", AMENORRHEA: "منقطعة" } as Record<string, string>,
    planningTitle: "تخططان للحمل معًا؟",
    planningText: "ارتبط بشريكك للحصول على تقدير مشترك. تبقى سجلاتك خاصة، ويمكنك إلغاء الارتباط في أي وقت.",
    linkPartner: "الارتباط بالشريك",
    linkedWith: (n: string) => `مرتبط مع ${n}`,
    linkedText: "يمكنك إجراء تقييم مشترك يجمع العوامل السريرية لكلا الشريكين.",
    jointAssessment: "التقييم المشترك",
    questionTitle: "لديك سؤال عن رحلتك؟",
    questionText: "يجيب ReproAI من إرشادات ضمان ثقة ومنظمة الصحة العالمية الموثّقة ومن سجلك المعتمد، مع إشراك طبيبك.",
    askReproai: "اسأل ReproAI"
  }
};

function greetingKey(): "morning" | "afternoon" | "evening" {
  const h = new Date().getHours();
  return h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
}

interface Step {
  href: string;
  icon: ReactNode;
  title: string;
  detail: string;
  done?: boolean;
}

export default function OverviewPage() {
  const { data, loading, error } = usePatient();
  const { observations, loading: obsLoading } = useObservations(data?.profile.userId);
  const { record } = useRecord();
  const { locale } = useLocale();
  const ar = locale === "ar";
  const L = S[locale];

  if (loading) {
    return (
      <div className="content patient-content">
        <div className="loading-block" style={{ height: 230, margin: 0 }} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="content patient-content">
        <FormError>{error || L.loadError}</FormError>
      </div>
    );
  }

  const { profile, latestPrediction, isPaired, partner } = data;
  const sex = profile.sex;
  const name = firstName(profile.name);
  const temps = series(observations, isTemperature);
  const bbt = analyzeBbt(temps);
  const sleepPoints = series(observations, isSleep);
  const sleep = sleepStats(sleepPoints);
  const lastTemp = temps[temps.length - 1];
  const loggedTempToday = lastTemp ? isToday(lastTemp.date) : false;
  const recentTemps = temps.slice(-21);
  const recentBbt = analyzeBbt(recentTemps);
  const recentSleep = sleepPoints.slice(-21);
  const recentSleepStats = sleepStats(recentSleep);
  const tier = (t: string | null | undefined) => (ar && TIER_AR[t ?? ""] ? TIER_AR[t ?? ""] : tierCopy(t));
  const dateL = (d: string | Date) =>
    ar ? new Date(d).toLocaleDateString("ar-AE-u-nu-latn", { day: "numeric", month: "short" }) : shortDate(d);

  // ── Next best steps, derived only from what is (or isn't) recorded ─────────
  const steps: Step[] = [];
  if (!profile.intakeCompletedAt) {
    steps.push({
      href: "/patient/about",
      icon: <span className="step-icon calendar"><ClipboardCheck size={16} /></span>,
      title: L.aboutTitle,
      detail: L.aboutDetail
    });
  }
  // The most urgent pathway option from the rules engine leads the list.
  const topOption = record?.options.find((o) => o.priority === 1);
  if (topOption) {
    steps.unshift({
      href: "/patient/assessment",
      icon: <span className="step-icon calendar"><Sparkles size={16} /></span>,
      title: ar && topOption.ar ? topOption.ar.title : topOption.title,
      detail: ar && topOption.ar?.reason ? topOption.ar.reason : topOption.reason
    });
  }
  if (sex === "female") {
    steps.push({
      href: "/patient/wearables",
      icon: loggedTempToday ? (
        <span className="check-ring"><Check size={14} /></span>
      ) : (
        <span className="step-icon"><Thermometer size={16} /></span>
      ),
      title: loggedTempToday ? L.tempLogged : L.logTemp,
      detail: temps.length < MIN_BBT_READINGS ? L.readingsNeeded(temps.length, MIN_BBT_READINGS) : L.readingsRecorded(temps.length),
      done: loggedTempToday
    });
  }
  if (sex === "male" && profile.spermCount === null) {
    steps.push({
      href: "/patient/assessment",
      icon: <span className="step-icon"><Droplets size={16} /></span>,
      title: L.semenFromClinician,
      detail: L.semenFromClinicianDetail
    });
  }
  steps.push({
    href: "/patient/wearables",
    icon: <span className="step-icon moon"><MoonStar size={16} /></span>,
    title: sleep && sleep.mean >= 7 ? L.keepSleep : L.aimSleep,
    detail: sleep ? L.sleepAvg(formatHours(sleep.mean), sleep.nights) : L.startSleep
  });
  if (!isPaired) {
    steps.push({
      href: "/patient/pairing",
      icon: <span className="step-icon calendar"><HeartHandshake size={16} /></span>,
      title: L.linkPartnerStep,
      detail: L.linkPartnerDetail
    });
  }

  // ── Weekly insight banner ───────────────────────────────────────────────────
  let insightTitle: string;
  let insightText: string;
  let insightValue: string | null = null;
  let insightLabel = "";
  if (sex === "female") {
    if (bbt.status === "BIPHASIC") {
      insightTitle = L.riseTitle;
      insightText = L.riseText(bbt.shift.toFixed(2));
      insightValue = `+${bbt.shift.toFixed(2)}°C`;
      insightLabel = L.riseLabel;
    } else if (bbt.status === "MONOPHASIC") {
      insightTitle = L.noRiseTitle;
      insightText = L.noRiseText;
    } else {
      insightTitle = L.buildTitle;
      insightText = L.buildText(MIN_BBT_READINGS);
      insightValue = `${temps.length}/${MIN_BBT_READINGS}`;
      insightLabel = L.buildLabel;
    }
  } else if (sex === "male") {
    if (profile.spermCount !== null) {
      const above = profile.spermCount >= WHO_SPERM_LOWER_LIMIT;
      insightTitle = above ? L.semenInRange : L.semenDiscuss;
      insightText = above ? L.semenAboveText(profile.spermCount, WHO_SPERM_LOWER_LIMIT) : L.semenBelowText(profile.spermCount, WHO_SPERM_LOWER_LIMIT);
      insightValue = `${profile.spermCount}`;
      insightLabel = L.millionPerMl;
    } else {
      insightTitle = L.semenFromClinician;
      insightText = L.semenPendingText;
    }
  } else {
    insightTitle = L.welcomeTitle;
    insightText = L.welcomeText;
  }
  const semenPending = sex === "male" && profile.spermCount === null;

  return (
    <div className="content patient-content">
      <div className="patient-welcome">
        <div>
          <p className="date-label">
            {new Date().toLocaleDateString(ar ? "ar-AE-u-nu-latn" : "en-GB", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
          </p>
          <h1>
            {L[greetingKey()]}
            {name ? `${ar ? "، " : ", "}${name}` : ""}
          </h1>
          <span>{L.subtitle}</span>
        </div>
      </div>

      {obsLoading ? (
        <div className="loading-block" style={{ height: 232, margin: "0 0 17px" }} aria-label={L.loadingInsight} />
      ) : (
      <section className="journey-banner">
        <div className="journey-copy">
          <div className="eyebrow light">
            <Sparkles size={14} /> {L.insightEyebrow}
          </div>
          <h2>{insightTitle}</h2>
          <p>{insightText}</p>
          <Link href={semenPending ? "/patient/assessment" : "/patient/wearables"}>
            {semenPending ? L.viewTrajectory : L.explorePattern} <ArrowRight size={16} className="flip-rtl" />
          </Link>
        </div>
        <div className="journey-art" aria-hidden="true">
          <svg viewBox="0 0 360 170">
            <path
              d="M16 132 C65 124, 74 107, 112 116 S164 142, 191 93 S243 80, 264 68 S313 55, 345 26"
              fill="none"
              stroke="#fff"
              strokeOpacity=".8"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M16 132 C65 124, 74 107, 112 116 S164 142, 191 93 S243 80, 264 68 S313 55, 345 26 L345 170 L16 170Z"
              fill="url(#patientGradient)"
              opacity=".35"
            />
            <defs>
              <linearGradient id="patientGradient" x1="0" x2="0" y1="0" y2="1">
                <stop stopColor="#fff" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          {insightValue && (
            <div className="art-note">
              <span dir="ltr">{insightValue}</span>
              <small>{insightLabel}</small>
            </div>
          )}
        </div>
      </section>
      )}

      <section className="patient-grid">
        <article className="panel potential-card">
          <div className="panel-head">
            <div>
              <h2>{latestPrediction?.scope === "COUPLE" ? L.jointEstimate : L.reproPicture}</h2>
              <p>{latestPrediction ? L.reviewedOn(dateL(latestPrediction.createdAt)) : L.notAssessed}</p>
            </div>
          </div>
          {latestPrediction && latestPrediction.scope !== "COUPLE" ? (
            <div className="empty-state">
              <span className="soft-pill"><Sparkles size={14} /> {tier(latestPrediction.tier).label}</span>
              <strong>{tier(latestPrediction.tier).summary || L.reviewedLatest}</strong>
              {record?.assessments[0]?.percentile != null && sex === "female" && (
                <span>{L.amhIs(ar ? percentileWordsAr(record.assessments[0].percentile!) : percentileWords(record.assessments[0].percentile!))}</span>
              )}
            </div>
          ) : latestPrediction ? (
            <div className="potential-body">
              <PotentialGauge probability={latestPrediction.probability} tier={latestPrediction.tier} />
              <div className="potential-copy">
                <span className="soft-pill">
                  <Sparkles size={14} /> {tier(latestPrediction.tier).label}
                </span>
                <p>{tier(latestPrediction.tier).summary || L.estimateNote}</p>
                <ConfidenceBar low={latestPrediction.confidenceLow} high={latestPrediction.confidenceHigh} />
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <strong>{record?.pendingReview ? L.pendingTitle : L.baselineTitle}</strong>
              {record?.pendingReview ? L.pendingText : L.baselineText}
            </div>
          )}
          <Link className="full-link" href="/patient/assessment">
            {L.viewTrajectory} <ArrowRight size={15} className="flip-rtl" />
          </Link>
        </article>

        <article className="panel next-card">
          <div className="panel-head">
            <div>
              <h2>{L.nextSteps}</h2>
              <p>{L.nextStepsSub}</p>
            </div>
          </div>
          <div className="steps-list">
            {obsLoading && <div className="loading-block" style={{ height: 150 }} />}
            {!obsLoading && steps.slice(0, 4).map((s) => (
              <Link key={s.title} href={s.href}>
                {s.icon}
                <span>
                  <strong>{s.title}</strong>
                  <small>{s.detail}</small>
                </span>
                <ChevronRight size={16} className="flip-rtl" />
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="panel signals-card">
        <div className="panel-head">
          <div>
            <h2>{L.signals}</h2>
            <p>{sex === "female" ? L.signalsFemale : L.signalsMale}</p>
          </div>
          <Link className="text-button" href="/patient/wearables">
            {L.viewDetails} <ArrowRight size={15} className="flip-rtl" />
          </Link>
        </div>
        <div className="signal-grid">
          <div className="chart-area" dir="ltr">
            {obsLoading ? (
              <div className="loading-block" style={{ margin: 0 }} />
            ) : sex === "female" && recentTemps.length >= 2 ? (
              <TemperatureChart points={recentTemps} analysis={recentBbt} />
            ) : sex !== "female" && recentSleep.length >= 2 && recentSleepStats ? (
              <SleepChart points={recentSleep} stats={recentSleepStats} />
            ) : (
              <div className="empty-state" style={{ padding: "8px 0" }} dir={ar ? "rtl" : "ltr"}>
                <strong>{sex === "female" ? L.noTempTitle : L.habitsTitle}</strong>
                {sex === "female" ? L.noTempText : L.habitsText}
                <Link className="text-button" href="/patient/wearables">
                  {L.logMeasurement} <ArrowRight size={14} className="flip-rtl" />
                </Link>
              </div>
            )}
          </div>
          <div className="signal-stats">
            {sex === "female" && (
              <Stat
                icon={<span className="stat-icon temp"><Thermometer size={17} /></span>}
                label={lastTemp && isToday(lastTemp.date) ? L.tempToday : L.latestTemp}
                value={lastTemp ? `${lastTemp.value.toFixed(2)}°C` : L.notLogged}
                note={lastTemp && !isToday(lastTemp.date) ? dateL(lastTemp.date) : undefined}
              />
            )}
            {sex === "male" && (
              <Stat
                icon={<span className="stat-icon temp"><Droplets size={17} /></span>}
                label={L.spermConc}
                value={profile.spermCount !== null ? `${profile.spermCount} M/mL` : L.notRecorded}
                note={profile.spermCount !== null ? (profile.spermCount >= WHO_SPERM_LOWER_LIMIT ? L.inRange : L.belowRef) : undefined}
                good={profile.spermCount !== null && profile.spermCount >= WHO_SPERM_LOWER_LIMIT}
              />
            )}
            <Stat
              icon={<span className="stat-icon sleep"><MoonStar size={17} /></span>}
              label={L.sleepLast}
              value={sleep?.last != null ? formatHours(sleep.last) : L.notLogged}
              note={sleep?.last != null ? (sleep.last >= 7 ? L.good : L.below7) : undefined}
              good={sleep?.last != null && sleep.last >= 7}
            />
            <Stat
              icon={<span className="stat-icon cycle">{sex === "female" ? <Activity size={17} /> : <Scale size={17} />}</span>}
              label={sex === "female" ? L.cycle : L.bmi}
              value={
                sex === "female"
                  ? profile.cycleRegularity
                    ? L.cycleValue[profile.cycleRegularity] ?? profile.cycleRegularity
                    : L.notRecorded
                  : profile.bmi !== null
                    ? profile.bmi.toFixed(1)
                    : L.notRecorded
              }
              note={sex !== "female" && profile.bmi !== null ? (profile.bmi >= 20 && profile.bmi < 25 ? L.inRange : L.bmiTarget) : undefined}
              good={sex !== "female" && profile.bmi !== null && profile.bmi >= 20 && profile.bmi < 25}
            />
          </div>
        </div>
      </section>

      {!isPaired && (
        <section className="support-strip" style={{ marginTop: 16 }}>
          <div className="support-icon">
            <HeartHandshake size={21} />
          </div>
          <span>
            <strong>{L.planningTitle}</strong>
            <small>{L.planningText}</small>
          </span>
          <Link href="/patient/pairing">
            {L.linkPartner} <ArrowRight size={15} className="flip-rtl" />
          </Link>
        </section>
      )}
      {isPaired && partner && (
        <section className="support-strip" style={{ marginTop: 16 }}>
          <div className="support-icon">
            <CalendarDays size={21} />
          </div>
          <span>
            <strong>{L.linkedWith(firstName(partner.name) ?? partner.email)}</strong>
            <small>{L.linkedText}</small>
          </span>
          <Link href="/patient/assessment">
            {L.jointAssessment} <ArrowRight size={15} className="flip-rtl" />
          </Link>
        </section>
      )}

      <section className="support-strip" style={{ marginTop: 12 }}>
        <div className="support-icon">
          <MessageCircle size={21} />
        </div>
        <span>
          <strong>{L.questionTitle}</strong>
          <small>{L.questionText}</small>
        </span>
        <Link href="/patient/assistant">
          {L.askReproai} <ArrowRight size={15} className="flip-rtl" />
        </Link>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, note, good }: { icon: ReactNode; label: string; value: string; note?: string; good?: boolean }) {
  return (
    <div>
      {icon}
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
      {note ? <em className={good ? "good" : ""}>{note}</em> : <em />}
    </div>
  );
}
