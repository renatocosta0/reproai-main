"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, PenLine } from "lucide-react";
import { usePatient } from "@/components/patient/PatientContext";
import { ClinicalNotice, FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { HISTORY_FLAGS } from "@/lib/labs";

type YesNo = "yes" | "no" | "";

// Self-reported intake. Labs are not asked for here: clinicians record them
// with provenance. Everything on this page is labelled "self-reported".
export default function AboutMePage() {
  const router = useRouter();
  const { data, loading, refresh } = usePatient();
  const sex = data?.profile.sex ?? null;
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
    if (!age || Number(age) < 18 || Number(age) > 55) return setError("Please enter your age (18–55).");
    if (trying === "") return setError("Please say whether you are trying to conceive.");
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
      setError(userMessage(err, "Could not save your answers."));
      setSaving(false);
    }
  }

  if (loading) return <div className="content patient-content"><div className="loading-block" style={{ margin: 0, height: 300 }} /></div>;

  return (
    <div className="content patient-content">
      <div className="page-heading">
        <div>
          <p className="date-label">ABOUT ME</p>
          <h1>A little about you</h1>
          <span>About three minutes. Answer what you know; you can skip anything you are unsure about.</span>
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <ClinicalNotice icon={PenLine}>
          These answers are labelled <strong>self-reported</strong>. You do not need to enter laboratory results; your clinician records those.
        </ClinicalNotice>
      </div>

      <form className="panel intake-form" onSubmit={submit}>
        <fieldset>
          <legend>You</legend>
          <div className="form-grid">
            <label className="field"><span>Age <em>years</em></span><input type="number" min={18} max={55} value={age} onChange={(e) => setAge(e.target.value)} required /></label>
            <label className="field"><span>Height <em>cm, optional</em></span><input type="number" min={120} max={230} value={height} onChange={(e) => setHeight(e.target.value)} /></label>
            <label className="field"><span>Weight <em>kg, optional</em></span><input type="number" min={30} max={250} value={weight} onChange={(e) => setWeight(e.target.value)} /></label>
          </div>
        </fieldset>

        <fieldset>
          <legend>Pregnancy plans</legend>
          <div className="choice-row" role="radiogroup" aria-label="Trying to conceive">
            <span>Are you trying to conceive now?</span>
            {(["yes", "no"] as const).map((v) => (
              <button type="button" key={v} className={trying === v ? "active" : ""} onClick={() => setTrying(v)} aria-pressed={trying === v}>{v === "yes" ? "Yes" : "Not now"}</button>
            ))}
          </div>
          {trying === "yes" && (
            <div className="form-grid">
              <label className="field"><span>For how many months? <em>approximate</em></span><input type="number" min={0} max={240} value={months} onChange={(e) => setMonths(e.target.value)} /></label>
              <label className="field"><span>Previous fertility treatment cycles <em>IUI/IVF, optional</em></span><input type="number" min={0} max={30} value={cycles} onChange={(e) => setCycles(e.target.value)} /></label>
            </div>
          )}
          {sex === "female" && trying !== "yes" && (
            <label className="check-field"><input type="checkbox" checked={preserve} onChange={(e) => setPreserve(e.target.checked)} /><span>I am interested in learning about egg freezing</span></label>
          )}
        </fieldset>

        {sex === "female" && (
          <fieldset>
            <legend>Your cycle</legend>
            <div className="choice-row" role="radiogroup" aria-label="Cycle pattern">
              <span>How regular are your periods?</span>
              {[["REGULAR", "Regular"], ["IRREGULAR", "Irregular"], ["AMENORRHEA", "Absent for 3+ months"]].map(([v, l]) => (
                <button type="button" key={v} className={cycle === v ? "active" : ""} onClick={() => setCycle(v)} aria-pressed={cycle === v}>{l}</button>
              ))}
            </div>
            <div className="choice-row" role="radiogroup" aria-label="Family history of early menopause">
              <span>Did your mother or a sister go through menopause before 45?</span>
              {(["yes", "no"] as const).map((v) => (
                <button type="button" key={v} className={familyEM === v ? "active" : ""} onClick={() => setFamilyEM(v)} aria-pressed={familyEM === v}>{v === "yes" ? "Yes" : "No / not known"}</button>
              ))}
            </div>
          </fieldset>
        )}

        <fieldset>
          <legend>Health history <small>tick any that apply</small></legend>
          <div className="flag-grid">
            {HISTORY_FLAGS.filter((f) => !f.sex || f.sex === sex).map((f) => (
              <label key={f.id} className="check-field"><input type="checkbox" checked={flags.includes(f.id)} onChange={() => toggle(f.id)} /><span>{f.label}</span></label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Lifestyle</legend>
          <div className="choice-row" role="radiogroup" aria-label="Smoking">
            <span>Do you smoke (including shisha or vaping)?</span>
            {[["NEVER", "Never"], ["FORMER", "I used to"], ["CURRENT", "Yes"]].map(([v, l]) => (
              <button type="button" key={v} className={smoking === v ? "active" : ""} onClick={() => setSmoking(v)} aria-pressed={smoking === v}>{l}</button>
            ))}
          </div>
        </fieldset>

        {error && <FormError>{error}</FormError>}
        <button className="primary" disabled={saving}>
          {saving ? "Saving…" : "Save and see my options"} <ArrowRight size={16} />
        </button>
      </form>
    </div>
  );
}
