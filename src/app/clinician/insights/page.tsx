"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Globe2, ShieldCheck, Users } from "lucide-react";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import type { PanelCohort, SystemCohort } from "@/lib/insights";
import { cohortArabic } from "@/lib/i18n-clinician";
import { useClinicianText } from "@/components/clinician/useClinicianText";

interface InsightsResponse {
  panel: { total: number; sharing: number; cohorts: PanelCohort[] };
  system: { consenting: number; suppressBelow: number; cohorts: SystemCohort[] };
}

// <bdi dir="ltr"> keeps "<5" from being mirrored to ">5" in Arabic (right-to-left) layout.
const n = (x: number | null, below: number) => <bdi dir="ltr">{x === null ? `<${below}` : String(x)}</bdi>;

export default function InsightsPage() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const { L, ar } = useClinicianText();
  const tr = (c: PanelCohort | SystemCohort) => (ar ? cohortArabic(c.id) : null) ?? c;

  useEffect(() => {
    api<InsightsResponse>("/api/clinician/insights")
      .then(setData)
      .catch((err) => setError(userMessage(err, L.loadInsightsError)));
  }, [L]);

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="date-label">{L.insightsEyebrow}</p>
          <h1>{L.insightsTitle}</h1>
          <span>{L.insightsSubtitle}</span>
        </div>
      </div>

      {error && <FormError>{error}</FormError>}
      {!data && !error && <div className="loading-block" style={{ margin: 0, height: 300 }} />}

      {data && (
        <>
          <h2 className="section-title">
            <Users size={18} style={{ display: "inline", verticalAlign: "-3px" }} /> {L.yourPanel}
            <small className="muted-note">{L.panelSharing(data.panel.sharing, data.panel.total)}</small>
          </h2>
          <section className="cohort-grid">
            {data.panel.cohorts.map((c) => (
              <article key={c.id} className={`panel cohort-tile ${c.people.length ? "" : "empty"}`}>
                <button className="cohort-head" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} disabled={!c.people.length}>
                  <strong>{c.people.length}</strong>
                  <span>
                    <b>{tr(c).title}</b>
                    <small>{tr(c).why}</small>
                  </span>
                  {c.people.length > 0 && <ChevronRight size={16} className={open === c.id ? "rot" : "flip-rtl"} />}
                </button>
                <p className="cohort-action">{L.suggested} {tr(c).action}</p>
                <small className="cohort-source">{L.rules} <span dir="ltr">{c.rules.join(", ")} · {c.source}</span></small>
                {open === c.id && (
                  <ul className="cohort-people">
                    {c.people.map((p) => (
                      <li key={p.userId}>
                        {p.caseId ? <Link href={`/clinician/patient/${p.caseId}`}>{p.name}</Link> : p.name}
                        <span>{p.sex ? L.sexWord(p.sex) : "–"} · {p.age ?? "–"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>

          <h2 className="section-title" style={{ marginTop: 22 }}>
            <Globe2 size={18} style={{ display: "inline", verticalAlign: "-3px" }} /> {L.acrossService}
            <small className="muted-note">{L.serviceConsenting(data.system.consenting)}</small>
          </h2>
          <div className="clinical-note" style={{ marginBottom: 14 }}>
            <ShieldCheck size={20} />
            <span>
              <strong>{L.privacy}</strong>
              {L.privacyText(data.system.suppressBelow)}
            </span>
          </div>
          <section className="panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>{L.thGroup}</th><th>{L.thPeople}</th><th>{L.thWomen}</th><th>{L.thMen}</th><th>{L.thAction}</th></tr>
                </thead>
                <tbody>
                  {data.system.cohorts.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{tr(c).title}</strong></td>
                      <td>{n(c.count, data.system.suppressBelow)}</td>
                      <td>{n(c.bySex.women, data.system.suppressBelow)}</td>
                      <td>{n(c.bySex.men, data.system.suppressBelow)}</td>
                      <td>{tr(c).action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
