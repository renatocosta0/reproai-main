"use client";

import { useCallback, useEffect, useState } from "react";
import { Lock, ShieldCheck } from "lucide-react";
import { ClinicalNotice, FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { shortDate } from "@/lib/observation-analysis";
import type { ConsentMap, Purpose, PurposeInfo } from "@/types/record";
import { useLocale } from "@/components/i18n/LocaleContext";
import { PURPOSE_AR } from "@/lib/i18n";

const ORDER: Purpose[] = ["CLINICIAN_ACCESS", "LAB_RESULTS", "WEARABLES", "CYCLE_TRACKING", "PARTNER_SHARING", "POPULATION_ANALYTICS"];

// Granular, revocable consent. Each switch takes effect immediately in the API
// and is recorded in the audit log.
export default function PrivacyPage() {
  const [state, setState] = useState<{ consents: ConsentMap; purposes: PurposeInfo; nonDiscrimination: string } | null>(null);
  const [busy, setBusy] = useState<Purpose | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const { locale, t } = useLocale();
  const ar = locale === "ar";

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
      setSaved(granted ? t("granted") : t("revoked"));
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
          <p className="date-label">{t("privacyEyebrow")}</p>
          <h1>{t("privacyTitle")}</h1>
          <span>{t("privacySubtitle")}</span>
        </div>
      </div>

      {state && (
        <div style={{ marginBottom: 16 }}>
          <ClinicalNotice icon={ShieldCheck}>
            <strong>{t("ourPromise")}</strong> {ar ? t("nonDiscrimination") : state.nonDiscrimination}
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
            const info = ar ? { ...state.purposes[p], ...PURPOSE_AR[p] } : state.purposes[p];
            const c = state.consents[p];
            return (
              <div className="consent-row" key={p}>
                <span className="consent-icon"><Lock size={16} aria-hidden /></span>
                <div>
                  <strong>{info.title}</strong>
                  <p>{info.description}</p>
                  {c.updatedAt && <small>{t("lastChanged")} {shortDate(c.updatedAt)}</small>}
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
