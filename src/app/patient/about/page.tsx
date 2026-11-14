"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PenLine } from "lucide-react";
import { usePatient } from "@/components/patient/PatientContext";
import { ClinicalNotice, FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { HISTORY_FLAGS } from "@/lib/labs";
import { useLocale } from "@/components/i18n/LocaleContext";

type YesNo = "yes" | "no" | "";

const S = {
  en: {
    ageError: "Please enter your age (18–55).",
    tryingError: "Please say whether you are trying to conceive.",
    saveError: "Could not save your answers.",
    eyebrow: "ABOUT ME",
    title: "A little about you",
    subtitle: "About three minutes. Answer what you know; you can skip anything you are unsure about.",
    notice1: "These answers are labelled ",
    selfReported: "self-reported",
    notice2: ". You do not need to enter laboratory results; your clinician records those.",
    you: "You",
    age: "Age", years: "years",
    height: "Height", heightHint: "cm, optional",
    weight: "Weight", weightHint: "kg, optional",
    plans: "Pregnancy plans",
    tryingAria: "Trying to conceive",
    tryingQ: "Are you trying to conceive now?",
    yes: "Yes", notNow: "Not now",
    months: "For how many months?", approx: "approximate",
    cycles: "Previous fertility treatment cycles", cyclesHint: "IUI/IVF, optional",
    eggFreezing: "I am interested in learning about egg freezing",
    yourCycle: "Your cycle",
    cycleAria: "Cycle pattern",
    cycleQ: "How regular are your periods?",
    cycleOptions: [["REGULAR", "Regular"], ["IRREGULAR", "Irregular"], ["AMENORRHEA", "Absent for 3+ months"]],
    familyAria: "Family history of early menopause",
    familyQ: "Did your mother or a sister go through menopause before 45?",
    noNotKnown: "No / not known",
    history: "Health history", tick: "tick any that apply",
    lifestyle: "Lifestyle",
    smokingAria: "Smoking",
    smokingQ: "Do you smoke (including shisha or vaping)?",
    smokingOptions: [["NEVER", "Never"], ["FORMER", "I used to"], ["CURRENT", "Yes"]],
    saving: "Saving…",
    save: "Save and see my options",
    flags: {} as Record<string, string>
  },
  ar: {
    ageError: "يُرجى إدخال عمرك (١٨–٥٥).",
    tryingError: "يُرجى الإجابة عمّا إذا كنت تحاول الإنجاب.",
    saveError: "تعذّر حفظ إجاباتك.",
    eyebrow: "معلوماتي",
    title: "قليل من المعلومات عنك",
    subtitle: "نحو ثلاث دقائق. أجب عمّا تعرفه، ويمكنك تخطي ما لست متأكدًا منه.",
    notice1: "تُصنَّف هذه الإجابات بأنها ",
    selfReported: "مُدخلة من المريض",
    notice2: ". لا تحتاج إلى إدخال نتائج المختبر، فطبيبك يسجّلها.",
    you: "أنت",
    age: "العمر", years: "سنة",
    height: "الطول", heightHint: "سم، اختياري",
    weight: "الوزن", weightHint: "كغ، اختياري",
    plans: "خطط الحمل",
    tryingAria: "محاولة الإنجاب",
    tryingQ: "هل تحاول الإنجاب حاليًا؟",
    yes: "نعم", notNow: "ليس الآن",
    months: "منذ كم شهرًا؟", approx: "تقريبًا",
    cycles: "دورات علاج الخصوبة السابقة", cyclesHint: "تلقيح صناعي أو أطفال أنابيب، اختياري",
    eggFreezing: "أرغب في معرفة المزيد عن تجميد البويضات",
    yourCycle: "دورتك الشهرية",
    cycleAria: "نمط الدورة",
    cycleQ: "ما مدى انتظام دورتك الشهرية؟",
    cycleOptions: [["REGULAR", "منتظمة"], ["IRREGULAR", "غير منتظمة"], ["AMENORRHEA", "منقطعة منذ ٣ أشهر أو أكثر"]],
    familyAria: "تاريخ عائلي لانقطاع الطمث المبكر",
    familyQ: "هل بلغت والدتك أو إحدى أخواتك سن انقطاع الطمث قبل ٤٥ عامًا؟",
    noNotKnown: "لا / غير معروف",
    history: "التاريخ الصحي", tick: "اختر كل ما ينطبق",
    lifestyle: "نمط الحياة",
    smokingAria: "التدخين",
    smokingQ: "هل تدخّن (بما في ذلك الشيشة أو السجائر الإلكترونية)؟",
    smokingOptions: [["NEVER", "لم أدخّن قط"], ["FORMER", "كنت أدخّن"], ["CURRENT", "نعم"]],
    saving: "جارٍ الحفظ…",
    save: "احفظ واعرض خياراتي",
    flags: {
      PCOS: "متلازمة تكيّس المبايض",
      ENDOMETRIOSIS: "بطانة الرحم المهاجرة",
      PELVIC_INFECTION: "التهاب الحوض (مثل مرض التهاب الحوض)",
      PELVIC_SURGERY: "جراحة في الحوض أو المبيض",
      UNDESCENDED_TESTIS: "خصية معلّقة أو جراحة في الخصية",
      VARICOCELE: "دوالي الخصية",
      CHEMOTHERAPY: "علاج كيميائي أو إشعاعي",
      GENETIC_DISORDER: "حالة وراثية أو كروموسومية معروفة",
      THYROID: "اضطراب في الغدة الدرقية",
      DIABETES: "داء السكري"
    } as Record<string, string>
  }
};

// Self-reported intake. Labs are not asked for here: clinicians record them
// with provenance. Everything on this page is labelled "self-reported".
export default function AboutMePage() {
  const router = useRouter();
  const { data, loading, refresh } = usePatient();
  const sex = data?.profile.sex ?? null;
  const { locale } = useLocale();
  const L = S[locale];
  const [age, setAge] = useState("");
  const [height, setHeight] = useState("");
  const [weight, setWeight] = useState("");
  const [trying, setTrying] = useState<YesNo>("");
  const [months, setMonths] = useState("");
  const [cycle, setCycle] = useState("");
  const [flags, setFlags] = useState<string[]>([]);
  const [familyEM, setFamilyEM] = useState<YesNo>("");
  const [smoking, setSmoking] = useState("");
  const [preserve, setPreserve] = useState(false);
  const [cycles, setCycles] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prof = data?.profile;
    if (!prof) return;
    setAge(prof.age != null ? String(prof.age) : "");
    setTrying(prof.tryingToConceive === true ? "yes" : prof.tryingToConceive === false ? "no" : "");
    setMonths(prof.infertilityDurationMonths != null ? String(prof.infertilityDurationMonths) : "");
    setCycle(prof.cycleRegularity ?? "");
    setFlags(prof.historyFlags ? JSON.parse(prof.historyFlags) : prof.pcosHistory ? ["PCOS"] : []);
    setFamilyEM(prof.familyEarlyMenopause === true ? "yes" : prof.familyEarlyMenopause === false ? "no" : "");
    setSmoking(prof.smoking ?? "");
    setPreserve(Boolean(prof.preservationIntent));
    setCycles(prof.priorCycles != null ? String(prof.priorCycles) : "");
  }, [data]);

  function toggle(id: string) {
    setFlags((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!age || Number(age) < 18 || Number(age) > 55) return setError(L.ageError);
    if (trying === "") return setError(L.tryingError);
    setSaving(true);
    try {
      await api("/api/patient/profile", {
        method: "PATCH",
        body: JSON.stringify({
          age: Number(age),
          ...(height && weight ? { heightCm: Number(height), weightKg: Number(weight) } : {}),
          tryingToConceive: trying === "yes",
          monthsTrying: trying === "yes" ? (months === "" ? null : Number(months)) : 0,
          cycleRegularity: sex === "female" ? cycle || null : null,
          historyFlags: flags,
          familyEarlyMenopause: sex === "female" ? (familyEM === "" ? null : familyEM === "yes") : null,
          smoking: smoking || null,
          preservationIntent: preserve,
          priorCycles: cycles === "" ? null : Number(cycles),
          completeIntake: true
        })
      });
      await refresh();
      router.push("/patient/assessment");
    } catch (err) {
      setError(userMessage(err, L.saveError));
      setSaving(false);
    }
  }

  if (loading) return <div className="content patient-content"><div className="loading-block" style={{ margin: 0, height: 300 }} /></div>;

  return (
    <div className="content patient-content">
      <div className="page-heading">
        <div>
          <p className="date-label">{L.eyebrow}</p>
          <h1>{L.title}</h1>
          <span>{L.subtitle}</span>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <ClinicalNotice icon={PenLine}>
          {L.notice1}<strong>{L.selfReported}</strong>{L.notice2}
        </ClinicalNotice>
      </div>

      <form className="panel intake-form" onSubmit={submit}>
        <fieldset>
          <legend>{L.you}</legend>
          <div className="form-grid">
            <label className="field"><span>{L.age} <em>{L.years}</em></span><input type="number" min={18} max={55} value={age} onChange={(e) => setAge(e.target.value)} required /></label>
            <label className="field"><span>{L.height} <em>{L.heightHint}</em></span><input type="number" min={120} max={230} value={height} onChange={(e) => setHeight(e.target.value)} /></label>
            <label className="field"><span>{L.weight} <em>{L.weightHint}</em></span><input type="number" min={30} max={250} value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend>{L.plans}</legend>
          <div className="choice-row" role="radiogroup" aria-label={L.tryingAria}>
            <span>{L.tryingQ}</span>
            {(["yes", "no"] as const).map((v) => (
              <button type="button" key={v} className={trying === v ? "active" : ""} onClick={() => setTrying(v)} aria-pressed={trying === v}>{v === "yes" ? L.yes : L.notNow}</button>
            ))}
          </div>
          {trying === "yes" && (
            <div className="form-grid">
              <label className="field"><span>{L.months} <em>{L.approx}</em></span><input type="number" min={0} max={240} value={months} onChange={(e) => setMonths(e.target.value)} /></label>
              <label className="field"><span>{L.cycles} <em>{L.cyclesHint}</em></span><input type="number" min={0} max={30} value={cycles} onChange={(e) => setCycles(e.target.value)} /></label>
            </div>
          )}
          {sex === "female" && trying !== "yes" && (
            <label className="check-field"><input type="checkbox" checked={preserve} onChange={(e) => setPreserve(e.target.checked)} /><span>{L.eggFreezing}</span></label>
          )}
        </fieldset>

        {sex === "female" && (
          <fieldset>
            <legend>{L.yourCycle}</legend>
            <div className="choice-row" role="radiogroup" aria-label={L.cycleAria}>
              <span>{L.cycleQ}</span>
              {L.cycleOptions.map(([v, l]) => (
                <button type="button" key={v} className={cycle === v ? "active" : ""} onClick={() => setCycle(v)} aria-pressed={cycle === v}>{l}</button>
              ))}
            </div>
            <div className="choice-row" role="radiogroup" aria-label={L.familyAria}>
              <span>{L.familyQ}</span>
              {(["yes", "no"] as const).map((v) => (
                <button type="button" key={v} className={familyEM === v ? "active" : ""} onClick={() => setFamilyEM(v)} aria-pressed={familyEM === v}>{v === "yes" ? L.yes : L.noNotKnown}</button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend>{L.history} <small>{L.tick}</small></legend>
          <div className="flag-grid">
            {HISTORY_FLAGS.filter((f) => !f.sex || f.sex === sex).map((f) => (
              <label key={f.id} className="check-field"><input type="checkbox" checked={flags.includes(f.id)} onChange={() => toggle(f.id)} /><span>{L.flags[f.id] ?? f.label}</span></label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{L.lifestyle}</legend>
          <div className="choice-row" role="radiogroup" aria-label={L.smokingAria}>
            <span>{L.smokingQ}</span>
            {L.smokingOptions.map(([v, l]) => (
              <button type="button" key={v} className={smoking === v ? "active" : ""} onClick={() => setSmoking(v)} aria-pressed={smoking === v}>{l}</button>
            ))}
          </div>
        </fieldset>

        {error && <FormError>{error}</FormError>}
        <button className="primary" disabled={saving}>
          {saving ? L.saving : L.save} <ArrowRight size={16} className="flip-rtl" />
        </button>
      </form>
    </div>
  );
}
