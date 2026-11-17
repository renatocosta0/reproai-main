// Cohort case table, shared by the dashboard (couples and individuals as two
// tabs) and /clinician/cases (one combined list behind a dashboard statistic).

"use client";

import Link from "next/link";
import { HeartHandshake, UserRound } from "lucide-react";
import { band, caseInitials } from "@/lib/format";
import { tierCopy } from "@/lib/tiers";
import { TIER_AR } from "@/lib/i18n";
import type { ClinicianStrings } from "@/lib/i18n-clinician";
import type { CaseItem } from "@/types/clinician";

export type CaseTab = "COUPLE" | "INDIVIDUAL";

export function CaseTable({
  rows,
  tab,
  L,
  ago,
  ar,
  combined = false
}: {
  rows: CaseItem[];
  tab: CaseTab;
  L: ClinicianStrings;
  ago: (d: string) => string;
  ar: boolean;
  /** One list of couples and individuals together, with a Type column. */
  combined?: boolean;
}) {
  /** Couples are read as ages side by side; individuals as age · sex. */
  const isCouple = (c: CaseItem) => (combined ? c.scope === "COUPLE" : tab === "COUPLE");

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{combined ? L.thCase : tab === "COUPLE" ? L.thCouple : L.thPatient}</th>
            {combined && <th>{L.thType}</th>}
            <th>{combined || tab === "COUPLE" ? L.thAges : L.thAgeSex}</th>
            <th>{L.thLatest}</th>
            <th>{L.thReadings}</th>
            <th>{L.thStatus}</th>
            <th aria-label={L.thOpen} />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const p = c.latestPrediction;
            const lastActivity = p?.createdAt ?? c.createdAt;
            const status = c.activeAlert
              ? { tone: "rose", label: L.stAlertOpen }
              : c.users.length === 0
                ? { tone: "amber", label: L.stInvited }
                : !p
                  ? { tone: "amber", label: L.stNotAssessed }
                  : { tone: "mint", label: L.stMonitoring };
            return (
              <tr key={c.id}>
                <td>
                  <Link href={`/clinician/patient/${c.id}`} className="person-cell">
                    <div className={`avatar ${c.activeAlert ? "peach" : ""}`} aria-hidden>{caseInitials(c.displayName)}</div>
                    <span>
                      <strong>{c.displayName}</strong>
                      <small>{L.updated(ago(lastActivity))}</small>
                    </span>
                  </Link>
                </td>
                {combined && (
                  <td>
                    <span className="type-cell">{c.scope === "COUPLE" ? L.couple : L.individual}</span>
                  </td>
                )}
                <td>
                  {c.patients.length === 0
                    ? "–"
                    : isCouple(c)
                      ? c.patients.map((pt) => (pt.age ? `${pt.age}${ar && pt.sex ? " " : ""}${pt.sex === "female" ? L.sexF : pt.sex === "male" ? L.sexM : ""}` : "–")).join(" · ")
                      : `${c.patients[0].age ?? "–"} · ${c.patients[0].sex ? L.sexWord(c.patients[0].sex) : "–"}`}
                </td>
                <td>
                  {p ? (
                    <div className="score-cell">
                      <strong>{p.probability.toFixed(0)}%</strong>
                      <span className={band(p.probability) === "low" ? "negative" : ""}>
                        {p.confidenceLow != null && p.confidenceHigh != null ? `${Math.round(p.confidenceLow)}–${Math.round(p.confidenceHigh)}` : ar ? TIER_AR[p.tier ?? ""]?.label ?? tierCopy(p.tier).label : tierCopy(p.tier).label}
                      </span>
                      <div><i style={{ width: `${p.probability}%` }} /></div>
                    </div>
                  ) : (
                    <span style={{ color: "var(--text-faint)" }}>{L.stNotAssessed}</span>
                  )}
                </td>
                <td>{c.recentObservationsCount ? L.recentReadings(c.recentObservationsCount) : L.none}</td>
                <td>
                  <span className={`status-pill ${status.tone}`}><i />{status.label}</span>
                </td>
                <td>
                  <Link href={`/clinician/patient/${c.id}`} className="plain-icon" aria-label={L.openName(c.displayName)}>
                    {c.scope === "COUPLE" ? <HeartHandshake size={17} /> : <UserRound size={17} />}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
