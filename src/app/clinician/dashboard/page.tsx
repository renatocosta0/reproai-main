"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Bell, ChevronRight, HeartHandshake, Search, Sparkles, TrendingUp, UserPlus, Users, UserRound } from "lucide-react";
import { useClinician } from "@/components/clinician/ClinicianContext";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { band, caseInitials, shortReason, usd } from "@/lib/format";
import { tierCopy } from "@/lib/tiers";
import { TIER_AR } from "@/lib/i18n";
import { longDateL, type ClinicianStrings } from "@/lib/i18n-clinician";
import { useClinicianText } from "@/components/clinician/useClinicianText";
import type { CaseItem, DirectoryResponse, FollowUpItem } from "@/types/clinician";

type Tab = "COUPLE" | "INDIVIDUAL";

export default function ClinicianDashboard() {
  const { version, openPrescribe } = useClinician();
  const { L, locale, ago } = useClinicianText();
  const [dir, setDir] = useState<DirectoryResponse | null>(null);
  const [alerts, setAlerts] = useState<FollowUpItem[]>([]);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("COUPLE");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    try {
      const [d, f] = await Promise.all([
        api<DirectoryResponse>("/api/clinician/couples"),
        api<{ items: FollowUpItem[] }>("/api/follow-up")
      ]);
      setDir(d);
      setAlerts(f.items.filter((i) => i.status === "ALERT_RAISED"));
      setError("");
    } catch (err) {
      setError(userMessage(err, L.loadCohortError));
    }
  }, [L]);

  useEffect(() => {
    void load();
  }, [load, version]);

  const all = useMemo(() => (dir ? [...dir.couples, ...dir.individuals] : []), [dir]);
  const assessed = all.filter((c) => c.latestPrediction);
  const bands = {
    high: assessed.filter((c) => band(c.latestPrediction!.probability) === "high").length,
    moderate: assessed.filter((c) => band(c.latestPrediction!.probability) === "moderate").length,
    low: assessed.filter((c) => band(c.latestPrediction!.probability) === "low").length
  };
  const share = (n: number) => (assessed.length ? Math.round((n / assessed.length) * 100) : 0);
  const hiPct = share(bands.high);
  const modPct = share(bands.moderate);

  const rows = (tab === "COUPLE" ? dir?.couples : dir?.individuals) ?? [];
  const q = query.trim().toLowerCase();
  const filtered = q
    ? rows.filter(
        (c) =>
          c.displayName.toLowerCase().includes(q) ||
          c.users.some((u) => u.email.toLowerCase().includes(q)) ||
          c.id.toLowerCase().startsWith(q)
      )
    : rows;

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
          <h1>{L.cohortTitle}</h1>
          <span>{L.cohortSubtitle}</span>
        </div>
      </div>

      <section className="metrics-grid">
        <Metric label={L.mPeople} value={dir ? String(dir.counts.total) : "–"} detail={dir ? L.mPeopleDetail(dir.counts.couples, dir.counts.individuals) : ""} icon={<Users size={19} />} tone="teal" />
        <Metric label={L.mAssessed} value={dir ? String(assessed.length) : "–"} detail={dir ? L.mAssessedDetail(all.length - assessed.length) : ""} icon={<Activity size={19} />} tone="blue" />
        <Metric label={L.mAlerts} value={dir ? String(alerts.length) : "–"} detail={L.mAlertsDetail} icon={<Bell size={19} />} tone="coral" />
        <Metric
          label={L.mSavings}
          value={dir ? usd(dir.impactMetrics.estimatedSavingsUSD) : "–"}
          detail={dir ? L.mSavingsDetail(dir.impactMetrics.lowResponseCases, usd(dir.impactMetrics.ivfCycleCost)) : ""}
          icon={<TrendingUp size={19} />}
          tone="gold"
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel cohort-card">
          <div className="panel-head">
            <div>
              <h2>{L.outlookTitle}</h2>
              <p>{L.outlookSubtitle}</p>
            </div>
          </div>
          {!dir ? (
            <div className="loading-block" />
          ) : assessed.length === 0 ? (
            <div className="empty-state">
              <strong>{L.noAssessmentsTitle}</strong>
              {L.noAssessmentsText}
            </div>
          ) : (
            <div className="cohort-body">
              <div
                className="donut"
                style={{ background: `conic-gradient(#6eb7a4 0 ${hiPct}%, #e5b167 ${hiPct}% ${hiPct + modPct}%, #db776a ${hiPct + modPct}% 100%)` }}
                role="img"
                aria-label={L.donutAria(assessed.length, bands.high, bands.moderate, bands.low)}
              >
                <div>
                  <strong>{assessed.length}</strong>
                  <span>{L.assessedLower}</span>
                </div>
              </div>
              <div className="legend-list">
                <Legend tone="mint" title={L.higherEstimate} range="60–100%" n={bands.high} pct={share(bands.high)} />
                <Legend tone="amber" title={L.moderateEstimate} range="35–59%" n={bands.moderate} pct={share(bands.moderate)} />
                <Legend tone="coral" title={L.lowerEstimate} range={L.below35} n={bands.low} pct={share(bands.low)} />
              </div>
            </div>
          )}
          {dir && bands.low > 0 && (
            <div className="cohort-note">
              <Sparkles size={16} />
              <span>
                <strong>{L.worthALook}</strong>
                {L.lowCasesNote(bands.low)}
              </span>
              <span />
            </div>
          )}
        </article>

        <article className="panel alerts-card">
          <div className="panel-head">
            <div>
              <h2>{L.priorityTitle}</h2>
              <p>{L.prioritySubtitle}</p>
            </div>
          </div>
          <div className="alert-list">
            {alerts.length === 0 && dir && <div className="empty-state" style={{ padding: "8px 4px 18px" }}>{L.noOpenAlerts}</div>}
            {alerts.slice(0, 4).map((a) => {
              const name = a.patients.map((p) => p.name).filter(Boolean).join(" & ") || a.emails[0] || L.caseFallback;
              return (
                <Link key={a.id} href={`/clinician/patient/${a.caseId}`} className="alert-item">
                  <div className="alert-avatar red">{caseInitials(name)}</div>
                  <span>
                    <strong>{name}</strong>
                    <small dir="auto">{shortReason(a.note)}</small>
                    <em>{ago(a.createdAt)}</em>
                  </span>
                  <ChevronRight size={17} className="flip-rtl" />
                </Link>
              );
            })}
          </div>
          <Link className="full-link" href="/clinician/follow-up">
            {L.openBoard} <ArrowRight size={15} className="flip-rtl" />
          </Link>
        </article>
      </section>

      <section className="panel couples-panel">
        <div className="panel-head">
          <div className="segmented" role="tablist">
            <button role="tab" aria-selected={tab === "COUPLE"} className={tab === "COUPLE" ? "active" : ""} onClick={() => setTab("COUPLE")}>
              {L.couplesTab} {dir ? dir.counts.couples : ""}
            </button>
            <button role="tab" aria-selected={tab === "INDIVIDUAL"} className={tab === "INDIVIDUAL" ? "active" : ""} onClick={() => setTab("INDIVIDUAL")}>
              {L.individualsTab} {dir ? dir.counts.individuals : ""}
            </button>
          </div>
          <div className="inline-search">
            <Search size={17} />
            <input placeholder={L.searchPlaceholder} value={query} onChange={(e) => setQuery(e.target.value)} aria-label={L.searchAria} />
          </div>
        </div>
        {!dir ? (
          <div className="loading-block" style={{ marginTop: 20 }} />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <strong>{q ? L.noMatches : tab === "COUPLE" ? L.noCouples : L.noIndividuals}</strong>
            {q ? L.tryDifferent : L.prescribeFirst}
            {!q && (
              <button className="primary compact" onClick={openPrescribe}>
                <UserPlus size={16} /> {L.prescribe}
              </button>
            )}
          </div>
        ) : (
          <CaseTable rows={filtered} tab={tab} L={L} ago={ago} ar={locale === "ar"} />
        )}
      </section>
    </div>
  );
}

function CaseTable({ rows, tab, L, ago, ar }: { rows: CaseItem[]; tab: Tab; L: ClinicianStrings; ago: (d: string) => string; ar: boolean }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{tab === "COUPLE" ? L.thCouple : L.thPatient}</th>
            <th>{tab === "COUPLE" ? L.thAges : L.thAgeSex}</th>
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
                <td>
                  {c.patients.length === 0
                    ? "–"
                    : tab === "COUPLE"
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
                    <span style={{ color: "#9aa5a1" }}>{L.stNotAssessed}</span>
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

function Metric({ label, value, detail, icon, tone }: { label: string; value: string; detail: string; icon: React.ReactNode; tone: string }) {
  return (
    <article className="metric-card">
      <div className={`metric-icon ${tone}`}>{icon}</div>
      <div className="metric-label">{label}</div>
      <strong>{value}</strong>
      <div className="metric-detail">{detail}</div>
    </article>
  );
}

function Legend({ tone, title, range, n, pct }: { tone: string; title: string; range: string; n: number; pct: number }) {
  return (
    <div>
      <i className={tone} />
      <span>
        <strong>{title}</strong>
        <small>{range}</small>
      </span>
      <b>{n}</b>
      <em>{pct}%</em>
    </div>
  );
}
