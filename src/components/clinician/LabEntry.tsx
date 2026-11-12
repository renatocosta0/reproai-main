"use client";

import { FormEvent, useState } from "react";
import { FlaskConical } from "lucide-react";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { labsForSex, LABS, type LabCode } from "@/lib/labs";

function todayISO(): string {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

/** Clinician entry of a verified laboratory / ultrasound result. */
export function LabEntry({ caseId, userId, sex, onSaved }: { caseId: string; userId: string; sex: string | null; onSaved: () => void }) {
  const options = labsForSex(sex);
  const [code, setCode] = useState<LabCode>(options[0]?.code ?? "AMH");
  const [value, setValue] = useState("");
  const [date, setDate] = useState(todayISO());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const def = LABS[code];

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api(`/api/clinician/cases/${caseId}/labs`, {
        method: "POST",
        body: JSON.stringify({ userId, code, value: Number(value), collectedAt: new Date(`${date}T09:00:00`).toISOString() })
      });
      setValue("");
      onSaved();
    } catch (err) {
      setError(userMessage(err, "Could not save the result."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="lab-entry" onSubmit={submit}>
      <label className="field">
        <span>Result</span>
        <div className="input-wrap">
          <select value={code} onChange={(e) => setCode(e.target.value as LabCode)}>
            {options.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </label>
      <label className="field">
        <span>
          Value <em>{def.unit}</em>
        </span>
        <input type="number" inputMode="decimal" step={def.step} min={def.min} max={def.max} value={value} onChange={(e) => setValue(e.target.value)} required />
      </label>
      <label className="field">
        <span>Date collected</span>
        <input type="date" max={todayISO()} value={date} onChange={(e) => setDate(e.target.value)} required />
      </label>
      <button className="primary compact" disabled={busy || !value}>
        <FlaskConical size={15} /> {busy ? "Saving…" : "Save verified result"}
      </button>
      {error && <div className="lab-entry-error"><FormError>{error}</FormError></div>}
    </form>
  );
}
