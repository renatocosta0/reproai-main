"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { ClinicalNotice, FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { shortDate } from "@/lib/observation-analysis";
import type { ConsentMap, Purpose, PurposeInfo } from "@/types/record";

const ORDER: Purpose[] = ["CLINICIAN_ACCESS", "LAB_RESULTS", "WEARABLES", "PARTNER_SHARING", "POPULATION_ANALYTICS"];

// Granular, revocable consent. Each switch takes effect immediately in the API
// and is recorded in the audit log.
export default function PrivacyPage() {
  const [state, setState] = useState<{ consents: ConsentMap; purposes: PurposeInfo; nonDiscrimination: string } | null>(null);
  const [busy, setBusy] = useState<Purpose | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const load = useCallback(async () => {
    try {
      setState(await api("/api/patient/consent"));
    } catch (err) {
      setError(userMessage(err, "Could not load your consent settings."));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(purpose: Purpose, granted: boolean) {
    setBusy(purpose);
    setError("");
    setSaved("");
    try {
      const res = await api<{ consents: ConsentMap }>("/api/patient/consent", { method: "PUT", body: JSON.stringify({ purpose, granted }) });
      setState((s) => (s ? { ...s, consents: res.consents } : s));
      setSaved(granted ? "Permission given. This takes effect immediately." : "Permission withdrawn. This takes effect immediately; nothing you shared before is deleted.");
    } catch (err) {
      setError(userMessage(err, "Could not update this setting."));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="content patient-content">
      <div className="page-heading">
        <div>
          <p className="date-label">PRIVACY &amp; CONSENT</p>
          <h1>You decide who sees what</h1>
          <span>Change any of these at any time. Every change is recorded.</span>
        </div>
      </div>

      {state && (
        <div style={{ marginBottom: 16 }}>
          <ClinicalNotice icon={ShieldCheck}>
            <strong>Our promise:</strong> {state.nonDiscrimination}
          </ClinicalNotice>
        </div>
      )}
      {error && <div style={{ marginBottom: 16 }}><FormError>{error}</FormError></div>}
      {saved && <div style={{ marginBottom: 16 }}><ClinicalNotice>{saved}</ClinicalNotice></div>}

      {!state ? (
        <div className="loading-block" style={{ margin: 0 }} />
      ) : (
        <section className="panel consent-list">
          {ORDER.map((p) => {
            const info = state.purposes[p];
            const c = state.consents[p];
            return (
              <div className="consent-row" key={p}>
                <span className="consent-icon"><Lock size={16} aria-hidden /></span>
                <div>
                  <strong>{info.title}</strong>
                  <p>{info.description}</p>
                  {c.updatedAt && <small>Last changed {shortDate(c.updatedAt)}</small>}
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={c.granted}
                  aria-label={info.title}
                  className={`switch ${c.granted ? "on" : ""}`}
                  onClick={() => toggle(p, !c.granted)}
                  disabled={busy !== null}
                >
                  <i />
                </button>
              </div>
            );
          })}
        </section>
      )}
    </div>
  );
}
