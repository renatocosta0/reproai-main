"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Globe2, ShieldCheck, Users } from "lucide-react";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import type { PanelCohort, SystemCohort } from "@/lib/insights";

interface InsightsResponse {
  panel: { total: number; sharing: number; cohorts: PanelCohort[] };
  system: { consenting: number; suppressBelow: number; cohorts: SystemCohort[] };
}

const n = (x: number | null, below: number) => (x === null ? `<${below}` : String(x));

export default function InsightsPage() {
  const [data, setData] = useState<InsightsResponse | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    api<InsightsResponse>("/api/clinician/insights")
      .then(setData)
      .catch((err) => setError(userMessage(err, "Could not load population insight.")));
  }, []);

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="date-label">POPULATION INSIGHT</p>
          <h1>Who would benefit from earlier advice?</h1>
          <span>Groups found by the same cited rules your patients see. Decisions stay with you and your patients.</span>
        </div>
      </div>

      {error && <FormError>{error}</FormError>}
      {!data && !error && <div className="loading-block" style={{ margin: 0, height: 300 }} />}

      {data && (
        <>
          <h2 className="section-title">
            <Users size={18} style={{ display: "inline", verticalAlign: "-3px" }} /> Your panel
            <small className="muted-note"> · {data.panel.sharing} of {data.panel.total} people share their record with you</small>
          </h2>
          <section className="cohort-grid">
            {data.panel.cohorts.map((c) => (
              <article key={c.id} className={`panel cohort-tile ${c.people.length ? "" : "empty"}`}>
                <button className="cohort-head" onClick={() => setOpen(open === c.id ? null : c.id)} aria-expanded={open === c.id} disabled={!c.people.length}>
                  <strong>{c.people.length}</strong>
                  <span>
                    <b>{c.title}</b>
                    <small>{c.why}</small>
                  </span>
                  {c.people.length > 0 && <ChevronRight size={16} className={open === c.id ? "rot" : ""} />}
                </button>
                <p className="cohort-action">Suggested: {c.action}</p>
                <small className="cohort-source">Rules {c.rules.join(", ")} · {c.source}</small>
                {open === c.id && (
                  <ul className="cohort-people">
                    {c.people.map((p) => (
                      <li key={p.userId}>
                        {p.caseId ? <Link href={`/clinician/patient/${p.caseId}`}>{p.name}</Link> : p.name}
                        <span>{p.sex ?? "–"} · {p.age ?? "–"}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </article>
            ))}
          </section>

          <h2 className="section-title" style={{ marginTop: 22 }}>
            <Globe2 size={18} style={{ display: "inline", verticalAlign: "-3px" }} /> Across the service
            <small className="muted-note"> · anonymous, {data.system.consenting} people who opted in</small>
          </h2>
          <div className="clinical-note" style={{ marginBottom: 14 }}>
            <ShieldCheck size={20} />
            <span>
              <strong>Privacy</strong>
              Counts only, from people who chose &quot;Include me in anonymous service statistics&quot;. Groups smaller than{" "}
              {data.system.suppressBelow} are shown as &quot;&lt;{data.system.suppressBelow}&quot; so no one can be identified. No names
              or records leave the clinics that hold them.
            </span>
          </div>
          <section className="panel">
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Group</th><th>People</th><th>Women</th><th>Men</th><th>Suggested action</th></tr>
                </thead>
                <tbody>
                  {data.system.cohorts.map((c) => (
                    <tr key={c.id}>
                      <td><strong>{c.title}</strong></td>
                      <td>{n(c.count, data.system.suppressBelow)}</td>
                      <td>{n(c.bySex.women, data.system.suppressBelow)}</td>
                      <td>{n(c.bySex.men, data.system.suppressBelow)}</td>
                      <td>{c.action}</td>
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
