"use client";

// Printable case report for clinicians. Shows released information only, from
// the same API as the record page, and says which parts are recorded,
// calculated or clinician-written. The browser's print dialog saves it as PDF,
// which keeps Arabic text and right-to-left layout intact.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { ReviewCard } from "@/components/clinician/ReviewCard";
import { OptionsList } from "@/components/record/OptionsList";
import { SourceChip } from "@/components/record/Chips";
import { FormError } from "@/components/ui/Notice";
import { useClinicianText } from "@/components/clinician/useClinicianText";
import { api, userMessage } from "@/lib/api-client";
import { LABS, isAboveLimit, isOutsideReference, referenceText, type LabCode } from "@/lib/labs";
import { LAB_AR } from "@/lib/i18n";
import type { CaseDetail } from "@/types/clinician";

export default function CaseReportPage({ params }: { params: { id: string } }) {
  const { L, ar, date } = useClinicianText();
  const [data, setData] = useState<CaseDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<CaseDetail>(`/api/clinician/cases/${params.id}`)
      .then(setData)
      .catch((e) => setError(userMessage(e, "Could not load the case.")));
  }, [params.id]);

  // Always print on white: switch to the light theme for the print, then restore.
  useEffect(() => {
    const html = document.documentElement;
    let saved: string | null = null;
    const before = () => {
      saved = html.getAttribute("data-theme");
      html.setAttribute("data-theme", "light");
    };
    const after = () => {
      if (saved) html.setAttribute("data-theme", saved);
    };
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);

  if (error) return <div className="content"><FormError>{error}</FormError></div>;
  if (!data) return <div className="content"><p className="muted-note">…</p></div>;

  const name = data.members.map((m) => m.name).filter(Boolean).join(" & ") || data.invitation?.email || L.careCase;
  const released = data.assessments.filter((a) => a.status === "RELEASED");
  // For a couple, the joint estimate is the headline; otherwise the latest released one.
  const latest = (data.isCouple ? released.find((a) => a.scope === "COUPLE") : undefined) ?? released[0];

  return (
    <div className="content case-report">
      <div className="report-actions no-print">
        <Link className="secondary" href={`/clinician/patient/${data.id}`}>
          <ArrowLeft size={16} /> {L.rptBack}
        </Link>
        <button className="primary compact" onClick={() => window.print()}>
          <Printer size={16} /> {L.rptPrint}
        </button>
      </div>

      <header className="report-header">
        <p className="date-label">ReproAI · {L.rptTitle}</p>
        <h1>{name}</h1>
        <span>{L.rptGenerated(date(new Date()))} · {L.rptScope}</span>
      </header>

      {/* One short legend instead of a section: what is recorded, calculated or clinician-written. */}
      <p className="report-legend">
        <strong>{L.rptKinds}:</strong> {L.rptKindRecorded} {L.rptKindCalculated} {L.rptKindClinician} {L.rptKindNoAi}
      </p>

      <section className="report-section">
        <h2>{L.rptAssessment}</h2>
        {latest && latest.userId && data.members.length > 1 && (
          <p className="muted-note">{data.members.find((m) => m.userId === latest.userId)?.name ?? ""}</p>
        )}
        {latest ? <ReviewCard a={latest} onChanged={() => undefined} /> : <p className="muted-note">{L.rptNoAssessment}</p>}
      </section>

      {data.members.map((m) => {
        const who = m.name ?? m.email;
        if (!m.clinicianAccess) {
          return (
            <section className="report-section" key={m.userId}>
              <h2>{who}</h2>
              <p className="muted-note">{who} {L.rptHidden}</p>
            </section>
          );
        }
        const labs = [...m.labs].sort((a, b) => b.collectedAt.localeCompare(a.collectedAt));
        return (
          <section className="report-section" key={m.userId}>
            <h2>{who}</h2>
            <h3 className="mini-title">{L.rptLabs}</h3>
            {labs.length ? (
              <table className="report-table">
                <thead>
                  <tr><th>{L.rptThMarker}</th><th>{L.rptThResult}</th><th>{L.rptThDate}</th><th>{L.rptThSource}</th></tr>
                </thead>
                <tbody>
                  {labs.map((l) => {
                    const def = LABS[l.code as LabCode];
                    const below = def ? isOutsideReference(l.code as LabCode, l.value) : false;
                    return (
                      <tr key={l.id}>
                        <td>{ar ? LAB_AR[l.code] ?? def?.label ?? l.code : def?.label ?? l.code}</td>
                        <td>
                          <bdi>{l.value} {l.unit}</bdi>
                          {below && <small className="muted-note"> · {isAboveLimit(l.code as LabCode, l.value) ? L.rptAboveRef : L.rptBelowRef} (<bdi>{referenceText(l.code as LabCode)}</bdi>)</small>}
                        </td>
                        <td>{date(l.collectedAt)}</td>
                        <td><SourceChip source={l.source} audience="clinician" /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <p className="muted-note">{L.rptNoLabs}</p>
            )}
            <h3 className="mini-title">{L.rptOptions}</h3>
            {m.options.length ? (
              <>
                <OptionsList options={[...m.options].sort((a, b) => a.priority - b.priority)} audience="clinician" limit={3} />
                {m.options.length > 3 && <p className="muted-note">{L.rptMoreOptions(m.options.length - 3)}</p>}
              </>
            ) : (
              <p className="muted-note">{L.rptNoOptions}</p>
            )}
          </section>
        );
      })}

      <section className="report-section">
        <h2>{L.rptLimits}</h2>
        <ul className="report-kinds">
          {L.rptLimitList.map((t) => <li key={t}>{t}</li>)}
        </ul>
      </section>
    </div>
  );
}
