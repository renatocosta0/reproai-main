"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Activity, ArrowRight, Bell, ChevronRight, HeartHandshake, Search, Sparkles, TrendingUp, UserPlus, Users, UserRound } from "lucide-react";
import { useClinician } from "@/components/clinician/ClinicianContext";
import { FormError } from "@/components/ui/Notice";
import { api, userMessage } from "@/lib/api-client";
import { band, caseInitials, shortReason, timeAgo, usd } from "@/lib/format";
import { tierCopy } from "@/lib/tiers";
import type { CaseItem, DirectoryResponse, FollowUpItem } from "@/types/clinician";

type Tab = "COUPLE" | "INDIVIDUAL";

export default function ClinicianDashboard() {
  const { version, openPrescribe } = useClinician();
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
      setError(userMessage(err, "Could not load your cohort."));
    }
  }, []);

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
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
          </p>
          <h1>Cohort overview</h1>
          <span>What needs your attention across the people in your care.</span>
        </div>
      </div>

      <section className="metrics-grid">
        <Metric label="People in care" value={dir ? String(dir.counts.total) : "–"} detail={dir ? `${dir.counts.couples} couples · ${dir.counts.individuals} individuals` : ""} icon={<Users size={19} />} tone="teal" />
        <Metric label="Assessed" value={dir ? String(assessed.length) : "–"} detail={dir ? `${all.length - assessed.length} awaiting a first assessment` : ""} icon={<Activity size={19} />} tone="blue" />
        <Metric label="Open alerts" value={dir ? String(alerts.length) : "–"} detail="Wearable patterns and low estimates" icon={<Bell size={19} />} tone="coral" />
        <Metric
          label="Estimated savings"
          value={dir ? usd(dir.impactMetrics.estimatedSavingsUSD) : "–"}
          detail={dir ? `${dir.impactMetrics.lowResponseCases} low-response cases × ${usd(dir.impactMetrics.ivfCycleCost)} per avoided cycle` : ""}
          icon={<TrendingUp size={19} />}
          tone="gold"
        />
      </section>

      <section className="dashboard-grid">
        <article className="panel cohort-card">
          <div className="panel-head">
            <div>
              <h2>Cohort outlook</h2>
              <p>Latest estimate per case</p>
            </div>
          </div>
          {!dir ? (
            <div className="loading-block" />
          ) : assessed.length === 0 ? (
            <div className="empty-state">
              <strong>No assessments yet</strong>
              The distribution appears once your patients complete their first assessment.
            </div>
          ) : (
            <div className="cohort-body">
              <div
                className="donut"
                style={{ background: `conic-gradient(var(--chart-protective) 0 ${hiPct}%, var(--chart-moderate) ${hiPct}% ${hiPct + modPct}%, var(--chart-high) ${hiPct + modPct}% 100%)` }}
                role="img"
                aria-label={`${assessed.length} assessed cases: ${bands.high} high, ${bands.moderate} moderate, ${bands.low} low`}
              >
                <div>
                  <strong>{assessed.length}</strong>
                  <span>assessed</span>
                </div>
              </div>
              <div className="legend-list">
                <Legend tone="mint" title="Higher estimate" range="60–100%" n={bands.high} pct={share(bands.high)} />
                <Legend tone="amber" title="Moderate estimate" range="35–59%" n={bands.moderate} pct={share(bands.moderate)} />
                <Legend tone="coral" title="Lower estimate" range="Below 35%" n={bands.low} pct={share(bands.low)} />
              </div>
            </div>
          )}
          {dir && bands.low > 0 && (
            <div className="cohort-note">
              <Sparkles size={16} />
              <span>
                <strong>Worth a look</strong>
                {bands.low} case{bands.low === 1 ? " has" : "s have"} an estimate below 35%. Earlier review can help plan next steps.
              </span>
              <span />
            </div>
          )}
        </article>

        <article className="panel alerts-card">
          <div className="panel-head">
            <div>
              <h2>Priority follow-ups</h2>
              <p>Open alerts, newest first</p>
            </div>
          </div>
          <div className="alert-list">
            {alerts.length === 0 && dir && <div className="empty-state" style={{ padding: "8px 4px 18px" }}>No open alerts.</div>}
            {alerts.slice(0, 4).map((a) => {
              const name = a.patients.map((p) => p.name).filter(Boolean).join(" & ") || a.emails[0] || "Case";
              return (
                <Link key={a.id} href={`/clinician/patient/${a.caseId}`} className="alert-item">
                  <div className="alert-avatar red">{caseInitials(name)}</div>
                  <span>
                    <strong>{name}</strong>
                    <small>{shortReason(a.note)}</small>
                    <em>{timeAgo(a.createdAt)}</em>
                  </span>
                  <ChevronRight size={17} />
                </Link>
              );
            })}
          </div>
          <Link className="full-link" href="/clinician/follow-up">
            Open follow-up board <ArrowRight size={15} />
          </Link>
        </article>
      </section>

      <section className="panel couples-panel">
        <div className="panel-head">
          <div className="segmented" role="tablist">
            <button role="tab" aria-selected={tab === "COUPLE"} className={tab === "COUPLE" ? "active" : ""} onClick={() => setTab("COUPLE")}>
              Couples {dir ? dir.counts.couples : ""}
            </button>
            <button role="tab" aria-selected={tab === "INDIVIDUAL"} className={tab === "INDIVIDUAL" ? "active" : ""} onClick={() => setTab("INDIVIDUAL")}>
              Individuals {dir ? dir.counts.individuals : ""}
            </button>
          </div>
          <div className="inline-search">
            <Search size={17} />
            <input placeholder="Search name or email…" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search cases" />
          </div>
        </div>
        {!dir ? (
          <div className="loading-block" style={{ marginTop: 20 }} />
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <strong>{q ? "No matches" : tab === "COUPLE" ? "No couples yet" : "No individual patients yet"}</strong>
            {q ? "Try a different name or email." : "Prescribe ReproAI to invite your first patients."}
            {!q && (
              <button className="primary compact" onClick={openPrescribe}>
                <UserPlus size={16} /> Prescribe digital care
              </button>
            )}
          </div>
        ) : (
          <CaseTable rows={filtered} tab={tab} />
        )}
      </section>
    </div>
  );
}

function CaseTable({ rows, tab }: { rows: CaseItem[]; tab: Tab }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{tab === "COUPLE" ? "Couple" : "Patient"}</th>
            <th>{tab === "COUPLE" ? "Ages" : "Age · sex"}</th>
            <th>Latest estimate</th>
            <th>Readings</th>
            <th>Status</th>
            <th aria-label="Open" />
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const p = c.latestPrediction;
            const lastActivity = p?.createdAt ?? c.createdAt;
            const status = c.activeAlert
              ? { tone: "rose", label: "Alert open" }
              : c.users.length === 0
                ? { tone: "amber", label: "Invited" }
                : !p
                  ? { tone: "amber", label: "Not assessed" }
                  : { tone: "mint", label: "Monitoring" };
            return (
              <tr key={c.id}>
                <td>
                  <Link href={`/clinician/patient/${c.id}`} className="person-cell">
                    <div className={`avatar ${c.activeAlert ? "peach" : ""}`} aria-hidden>{caseInitials(c.displayName)}</div>
                    <span>
                      <strong>{c.displayName}</strong>
                      <small>Updated {timeAgo(lastActivity)}</small>
                    </span>
                  </Link>
                </td>
                <td>
                  {c.patients.length === 0
                    ? "–"
                    : tab === "COUPLE"
                      ? c.patients.map((pt) => (pt.age ? `${pt.age}${pt.sex === "female" ? "F" : pt.sex === "male" ? "M" : ""}` : "–")).join(" · ")
                      : `${c.patients[0].age ?? "–"} · ${c.patients[0].sex ?? "–"}`}
                </td>
                <td>
                  {p ? (
                    <div className="score-cell">
                      <strong>{p.probability.toFixed(0)}%</strong>
                      <span className={band(p.probability) === "low" ? "negative" : ""}>
                        {p.confidenceLow != null && p.confidenceHigh != null ? `${Math.round(p.confidenceLow)}–${Math.round(p.confidenceHigh)}` : tierCopy(p.tier).label}
                      </span>
                      <div><i style={{ width: `${p.probability}%` }} /></div>
                    </div>
                  ) : (
                    <span style={{ color: "var(--text-faint)" }}>Not assessed</span>
                  )}
                </td>
                <td>{c.recentObservationsCount ? `${c.recentObservationsCount}${c.recentObservationsCount >= 10 ? "+" : ""} recent` : "None"}</td>
                <td>
                  <span className={`status-pill ${status.tone}`}><i />{status.label}</span>
                </td>
                <td>
                  <Link href={`/clinician/patient/${c.id}`} className="plain-icon" aria-label={`Open ${c.displayName}`}>
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
