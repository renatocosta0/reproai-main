"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, CircleDot, Clock, HeartHandshake, MessagesSquare, Stethoscope, ClipboardCheck, FlaskConical, BadgeCheck, type LucideIcon } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { AppointmentCard } from "@/components/patient/AppointmentCard";
import { AskChip } from "@/components/patient/AskPanel";
import { ExplainTerms } from "@/components/patient/ExplainTerms";
import { LABS, type LabCode } from "@/lib/labs";
import { LAB_AR } from "@/lib/i18n";
import { currentStep, type NavStep, type StepId, type StepOwner, type StepStatus } from "@/lib/journey";

const ICON: Record<StepId, LucideIcon> = {
  profile: ClipboardCheck,
  tests: FlaskConical,
  review: BadgeCheck,
  consult: MessagesSquare,
  options: Stethoscope,
  partner: HeartHandshake
};

const S = {
  en: {
    title: "Where you are",
    sub: "Your path from first tests to talking through options. Each step shows who does it. Select a step to see what it involves.",
    youAreHere: "You are here",
    owner: { you: "You", clinician: "Your clinician", together: "Together" } as Record<StepOwner, string>,
    status: { done: "Done", current: "Ready", waiting: "With your clinician", upcoming: "Later", optional: "Optional" } as Record<StepStatus, string>,
    name: {
      profile: "Your profile",
      tests: "Baseline tests",
      review: "Clinician review",
      consult: "Consultation",
      options: "Your options",
      partner: "Partner (optional)"
    } as Record<StepId, string>,
    profileDone: "Your background details are on record. You can update them any time.",
    profileTodo: "A short questionnaire about you: about three minutes, no lab results needed.",
    profileGo: "Open About me",
    testsIntro: "Your clinician arranges these tests and records the results from the lab report. You can't enter lab values yourself, so every number in your record has a checked source.",
    onRecord: "On record",
    notYet: "Not on record yet",
    testsNone: "Your clinician will tell you which tests are right for you.",
    reviewIntro: "Your clinician reviews your results and releases an explanation to you. You only see an estimate after they have checked it.",
    reviewDone: (d: string) => `Released to you on ${d}.`,
    reviewWaiting: "With your clinician now. It appears here once they have reviewed it.",
    reviewUpcoming: "This starts once your baseline tests are on record.",
    reviewGo: "See your results",
    consultIntro: "A short conversation with your care team to go through your results and decide next steps together.",
    prepTitle: "Before you go",
    prep: ["Note the questions you want to ask.", "Check About me is up to date.", "Decide whether you'd like your partner to join."],
    optionsIntro: "Suggestions to discuss with your clinician, based on what is recorded. Your clinician decides with you.",
    optionsNone: "Nothing has been suggested yet. Options appear after your clinician has reviewed your results.",
    optionsGo: "See all options",
    kind: { RED_FLAG: "See a doctor", REFER: "Specialist", TEST: "Testing", PRESERVATION: "Preservation", COUNSEL: "Talk it through", OPTIMISE: "Your health" } as Record<string, string>,
    partnerDone: "You are linked with your partner. Your own records stay private.",
    partnerTodo: "If you are planning a pregnancy together, linking allows a joint estimate. Your own records stay private and you can unlink at any time.",
    partnerGo: "Link partner"
  },
  ar: {
    title: "أين أنت الآن",
    sub: "مسارك من الفحوص الأولى حتى مناقشة الخيارات. تُظهر كل خطوة من يقوم بها. اختر خطوة لترى ما تتضمنه.",
    youAreHere: "أنت هنا",
    owner: { you: "أنت", clinician: "طبيبك", together: "معًا" } as Record<StepOwner, string>,
    status: { done: "مكتملة", current: "جاهزة", waiting: "لدى طبيبك", upcoming: "لاحقًا", optional: "اختيارية" } as Record<StepStatus, string>,
    name: {
      profile: "ملفك الشخصي",
      tests: "الفحوص الأساسية",
      review: "مراجعة الطبيب",
      consult: "الاستشارة",
      options: "خياراتك",
      partner: "الشريك (اختياري)"
    } as Record<StepId, string>,
    profileDone: "معلوماتك الأساسية مسجّلة، ويمكنك تحديثها في أي وقت.",
    profileTodo: "استبيان قصير عنك: نحو ثلاث دقائق، دون الحاجة إلى نتائج مختبر.",
    profileGo: "فتح «معلوماتي»",
    testsIntro: "يرتّب طبيبك هذه الفحوص ويسجّل نتائجها من تقرير المختبر. لا يمكنك إدخال قيم المختبر بنفسك، لذلك لكل رقم في سجلك مصدر موثّق.",
    onRecord: "مسجّل",
    notYet: "غير مسجّل بعد",
    testsNone: "سيخبرك طبيبك بالفحوص المناسبة لك.",
    reviewIntro: "يراجع طبيبك نتائجك ويعتمد لك شرحًا لها. لا ترى أي تقدير إلا بعد أن يتحقق منه.",
    reviewDone: (d: string) => `اعتُمد لك في ${d}.`,
    reviewWaiting: "لدى طبيبك الآن، وسيظهر هنا بعد مراجعته.",
    reviewUpcoming: "تبدأ هذه الخطوة عندما تُسجَّل فحوصك الأساسية.",
    reviewGo: "عرض نتائجك",
    consultIntro: "محادثة قصيرة مع فريق رعايتك لمراجعة نتائجك وتحديد الخطوات التالية معًا.",
    prepTitle: "قبل الموعد",
    prep: ["دوّن الأسئلة التي تريد طرحها.", "تأكّد من أن «معلوماتي» محدّثة.", "قرّر إن كنت تريد حضور شريكك."],
    optionsIntro: "اقتراحات للنقاش مع طبيبك بناءً على ما هو مسجّل. يقرّر طبيبك معك.",
    optionsNone: "لم يُقترح شيء بعد. تظهر الخيارات بعد أن يراجع طبيبك نتائجك.",
    optionsGo: "عرض كل الخيارات",
    kind: { RED_FLAG: "راجع طبيبًا", REFER: "أخصائي", TEST: "فحوص", PRESERVATION: "حفظ الخصوبة", COUNSEL: "نقاش", OPTIMISE: "صحتك" } as Record<string, string>,
    partnerDone: "أنت مرتبط بشريكك، وتبقى سجلاتك الخاصة سرّية.",
    partnerTodo: "إذا كنتما تخططان للحمل معًا، يتيح الارتباط تقديرًا مشتركًا. تبقى سجلاتك خاصة ويمكنك إلغاء الارتباط في أي وقت.",
    partnerGo: "الارتباط بالشريك"
  }
};

export function CareNavigator({ steps, sex, formatDate, onAppointmentChange }: { steps: NavStep[]; sex: "female" | "male" | null; formatDate: (d: string) => string; onAppointmentChange?: () => void }) {
  const { locale } = useLocale();
  const ar = locale === "ar";
  const L = S[locale];
  const here = currentStep(steps);
  const [selected, setSelected] = useState<StepId>(here ?? steps[0].id);
  const step = steps.find((s) => s.id === selected) ?? steps[0];
  const labName = (c: LabCode) => (ar ? LAB_AR[c] ?? LABS[c].label : LABS[c].label);

  return (
    <section className="panel navigator">
      <div className="panel-head">
        <div>
          <h2>{L.title}</h2>
          <p>{L.sub}</p>
        </div>
      </div>

      <ol className="nav-steps" role="tablist" aria-label={L.title}>
        {steps.map((s, i) => {
          const Icon = ICON[s.id];
          return (
            <li key={s.id} className={`nav-step ${s.status} ${s.id === selected ? "selected" : ""}`}>
              <button
                type="button"
                role="tab"
                aria-selected={s.id === selected}
                aria-controls="nav-detail"
                onClick={() => setSelected(s.id)}
                onKeyDown={(e) => {
                  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                  // In right-to-left, the next step is to the left.
                  const dir = (e.key === "ArrowRight") !== ar ? 1 : -1;
                  e.preventDefault();
                  const next = steps[Math.min(steps.length - 1, Math.max(0, i + dir))];
                  setSelected(next.id);
                  (e.currentTarget.closest("ol")?.querySelectorAll("button")[steps.indexOf(next)] as HTMLButtonElement | undefined)?.focus();
                }}
              >
                <span className="nav-dot" aria-hidden>
                  {s.status === "done" ? <Check size={15} /> : s.status === "waiting" ? <Clock size={14} /> : <Icon size={15} />}
                </span>
                <span className="nav-label">
                  <strong>{L.name[s.id]}</strong>
                  <small>{s.id === here ? L.youAreHere : L.status[s.status]}</small>
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      <div id="nav-detail" className="nav-detail" role="tabpanel">
        <div className="nav-detail-head">
          <h3>{L.name[step.id]}</h3>
          <span className={`nav-owner ${step.owner}`}>{L.owner[step.owner]}</span>
          <span className={`nav-status ${step.status}`}>
            <CircleDot size={11} aria-hidden /> {step.id === here ? L.youAreHere : L.status[step.status]}
          </span>
          <span style={{ flex: 1 }} />
          {step.id === "tests" && (
            <AskChip
              topic={{
                title: L.name.tests,
                questions:
                  sex === "male"
                    ? ["Why do both partners get tested?", "Is my sperm concentration in the normal range?"]
                    : ["What is an antral follicle count?", "Does AMH tell me whether I can get pregnant?"]
              }}
            />
          )}
          {step.id === "consult" && <AskChip topic={{ title: L.name.consult, questions: ["What happens at a fertility consultation?", sex === "female" ? "When should I see a specialist?" : "When should we see a specialist?"] }} />}
          {step.id === "options" && <AskChip topic={{ title: L.name.options, questions: ["When should I see a specialist?", sex === "female" ? "Who can have social egg freezing under Thiqa?" : "Can sperm be frozen before treatment?"] }} />}
        </div>

        {step.id === "profile" && (
          <>
            <p>{step.status === "done" ? L.profileDone : L.profileTodo}</p>
            <Link className="text-button" href="/patient/about">
              {L.profileGo} <ArrowRight size={14} className="flip-rtl" />
            </Link>
          </>
        )}

        {step.id === "tests" && (
          <>
            <p>{L.testsIntro}</p>
            {step.tests && step.tests.recorded.length + step.tests.missing.length > 0 ? (
              <ul className="nav-checklist">
                {step.tests.recorded.map((c) => (
                  <li key={c} className="done">
                    <Check size={14} aria-hidden /> {labName(c)} <small>{L.onRecord}</small>
                  </li>
                ))}
                {step.tests.missing.map((c) => (
                  <li key={c}>
                    <Clock size={14} aria-hidden /> {labName(c)} <small>{L.notYet}</small>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-note">{L.testsNone}</p>
            )}
          </>
        )}

        {step.id === "review" && (
          <>
            <p>{L.reviewIntro}</p>
            <p className="nav-state">
              {step.status === "done" && step.reviewedAt ? L.reviewDone(formatDate(step.reviewedAt)) : step.status === "waiting" ? L.reviewWaiting : L.reviewUpcoming}
            </p>
            {step.status === "done" && (
              <Link className="text-button" href="/patient/assessment">
                {L.reviewGo} <ArrowRight size={14} className="flip-rtl" />
              </Link>
            )}
          </>
        )}

        {step.id === "consult" && (
          <>
            <p>{L.consultIntro}</p>
            <AppointmentCard onStatusChange={onAppointmentChange} />
            <div className="nav-prep">
              <strong>{L.prepTitle}</strong>
              <ul>
                {L.prep.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        {step.id === "options" && (
          <>
            <p>{L.optionsIntro}</p>
            {step.discuss && step.discuss.length > 0 ? (
              <ul className="nav-options">
                {step.discuss.slice(0, 3).map((o) => (
                  <li key={o.ruleId}>
                    <span className="option-kind">{L.kind[o.kind] ?? o.kind}</span>
                    <strong>{ar && o.ar ? o.ar.title : o.title}</strong>
                    <p>
                      <ExplainTerms text={ar && o.ar ? o.ar.text : o.patientText} />
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted-note">{L.optionsNone}</p>
            )}
            <Link className="text-button" href="/patient/assessment">
              {L.optionsGo} <ArrowRight size={14} className="flip-rtl" />
            </Link>
          </>
        )}

        {step.id === "partner" && (
          <>
            <p>{step.status === "done" ? L.partnerDone : L.partnerTodo}</p>
            {step.status !== "done" && (
              <Link className="text-button" href="/patient/pairing">
                {L.partnerGo} <ArrowRight size={14} className="flip-rtl" />
              </Link>
            )}
          </>
        )}
      </div>
    </section>
  );
}
