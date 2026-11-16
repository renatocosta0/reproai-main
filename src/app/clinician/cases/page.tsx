// Drill-down from a dashboard statistic: one list of every case in the panel
// (couples and individuals together) behind the number that was clicked. The
// filter lives in the URL so a clinician can share or bookmark the view.

"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Search, UserPlus } from "lucide-react";
import { useClinician } from "@/components/clinician/ClinicianContext";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { band } from "@/lib/format";
import { longDateL } from "@/lib/i18n-clinician";
import { useClinicianText } from "@/components/clinician/useClinicianText";
import { CaseTable } from "@/components/clinician/CaseTable";
import type { CaseItem, DirectoryResponse } from "@/types/clinician";

type Filter = "all" | "assessed" | "high" | "moderate" | "low";

const FILTERS: string[] = ["all", "assessed", "high", "moderate", "low"];
const readFilter = (v: string | null): Filter => (v && FILTERS.includes(v) ? (v as Filter) : "all");

export default function CasesPage() {
  return (
    <Suspense fallback={<div className="content"><div className="loading-block" /></div>}>
      <Cases />
    </Suspense>
  );
}

function Cases() {
  const filter = readFilter(useSearchParams().get("filter"));
  const { version, openPrescribe } = useClinician();
  const { L, locale, ago } = useClinicianText();
  const [dir, setDir] = useState<DirectoryResponse | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      setDir(await api<DirectoryResponse>("/api/clinician/couples"));
      setError("");
    } catch (err) {
      setError(userMessage(err, L.loadCohortError));
    }
  }, [L]);

  useEffect(() => {
    void load();
  }, [load, version]);

  const all = useMemo(() => (dir ? [...dir.couples, ...dir.individuals] : []), [dir]);
  const assessed = useMemo(() => all.filter((c) => c.latestPrediction), [all]);

  /** The same rule the dashboard's donut is drawn from, so the counts always agree. */
  const matches = (c: CaseItem) => {
    if (filter === "all") return true;
    const p = c.latestPrediction;
    if (!p) return false;
    return filter === "assessed" ? true : band(p.probability) === filter;
  };

  const q = query.trim().toLowerCase();
  const searched = q
    ? all.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.users.some((u) => u.email.toLowerCase().includes(q)) ||
          c.id.toLowerCase().startsWith(q)
      )
    : all;
  const rows = searched.filter(matches);
  const searching = q.length > 0;

  const summary = [
    { key: "all", label: L.filterAll, n: all.length, tone: "" },
    { key: "assessed", label: L.mAssessed, n: assessed.length, tone: "" },
    { key: "high", label: L.higherEstimate, n: bandCount(assessed, "high"), tone: "mint" },
    { key: "moderate", label: L.moderateEstimate, n: bandCount(assessed, "moderate"), tone: "amber" },
    { key: "low", label: L.lowerEstimate, n: bandCount(assessed, "low"), tone: "coral" }
  ] as const;
  const activeLabel = (summary.find((s) => s.key === filter) ?? summary[0]).label;

  if (error) {
    return <div className="content"><FormError>{error}</FormError></div>;
  }

  return (
    <div className="content">
      <div className="page-heading">
        <div>
          <p className="date-label">
            {longDateL(locale, new Date(), { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
          </p>
          <h1>{L.casesTitle}</h1>
          <span>{L.casesSubtitle}</span>
        </div>
        <Link href="/clinician/dashboard" className="secondary">
          <ArrowLeft size={15} className="flip-rtl" /> {L.backToCohort}
        </Link>
      </div>

      <nav className="cases-summary" aria-label={L.casesTitle}>
        {summary.map((s) => (
          <Link
            key={s.key}
            href={s.key === "all" ? "/clinician/cases" : `/clinician/cases?filter=${s.key}`}
            className={s.key === filter ? "is-active" : ""}
            aria-current={s.key === filter ? "page" : undefined}
          >
            <strong>{dir ? String(s.n) : "–"}</strong>
            <span>
              {s.tone && <i className={s.tone} />}
              {s.label}
            </span>
          </Link>
        ))}
      </nav>

      <section className="panel couples-panel">
        <div className="panel-head">
          <div>
            <h2>{activeLabel}</h2>
          </div>
          <div className="inline-search">
            <Search size={17} />
            <input placeholder={L.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={L.searchAria} />
          </div>
        </div>
        {!dir ? (
          <div className="loading-block" style={{ marginTop: 20 }} />
        ) : all.length === 0 ? (
          <div className="empty-state">
            <strong>{L.casesEmptyTitle}</strong>
            {L.prescribeFirst}
            <button className="primary compact" onClick={openPrescribe}>
              <UserPlus size={16} /> {L.prescribe}
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="empty-state">
            <strong>{searching ? L.noMatches : L.filterNoMatchTitle}</strong>
            {searching ? L.tryDifferent : L.filterNoMatchText}
            {!searching && filter !== "all" && (
              <Link href="/clinician/cases" className="secondary">
                {L.filterAll}
              </Link>
            )}
          </div>
        ) : (
          <CaseTable rows={rows} tab="COUPLE" combined L={L} ago={ago} ar={locale === "ar"} />
        )}
      </section>
    </div>
  );
}

function bandCount(rows: CaseItem[], b: "high" | "moderate" | "low") {
  return rows.filter((c) => c.latestPrediction && band(c.latestPrediction.probability) === b).length;
}
