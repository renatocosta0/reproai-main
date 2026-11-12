"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardCheck,
  Droplets,
  HeartHandshake,
  MessageCircle,
  MoonStar,
  Scale,
  Sparkles,
  Thermometer
} from "lucide-react";
import { firstName, usePatient } from "@/components/patient/PatientContext";
import { useObservations } from "@/components/patient/useObservations";
import { percentileWords, useRecord } from "@/components/patient/useRecord";
import { ConfidenceBar, PotentialGauge } from "@/components/patient/PotentialGauge";
import { TemperatureChart } from "@/components/charts/TemperatureChart";
import { SleepChart } from "@/components/charts/SleepChart";
import { FormError } from "@/components/ui/Notice";
import {
  analyzeBbt,
  formatHours,
  isSleep,
  isTemperature,
  isToday,
  MIN_BBT_READINGS,
  series,
  shortDate,
  sleepStats
} from "@/lib/observation-analysis";
import { tierCopy, WHO_SPERM_LOWER_LIMIT } from "@/lib/tiers";

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
}

interface Step {
  href: string;
  icon: ReactNode;
  title: string;
  detail: string;
  done?: boolean;
}

export default function OverviewPage() {
  const { data, loading, error } = usePatient();
  const { observations, loading: obsLoading } = useObservations(data?.profile.userId);
  const { record } = useRecord();

  if (loading) {
    return (
      <div className="content patient-content">
        <div className="loading-block" style={{ height: 230, margin: 0 }} />
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="content patient-content">
        <FormError>{error || "Could not load your profile."}</FormError>
      </div>
    );
  }

  const { profile, latestPrediction, isPaired, partner } = data;
  const sex = profile.sex;
  const name = firstName(profile.name);
  const temps = series(observations, isTemperature);
  const bbt = analyzeBbt(temps);
  const sleepPoints = series(observations, isSleep);
  const sleep = sleepStats(sleepPoints);
  const lastTemp = temps[temps.length - 1];
  const loggedTempToday = lastTemp ? isToday(lastTemp.date) : false;
  const recentTemps = temps.slice(-21);
  const recentBbt = analyzeBbt(recentTemps);
  const recentSleep = sleepPoints.slice(-21);
  const recentSleepStats = sleepStats(recentSleep);

  // ── Next best steps, derived only from what is (or isn't) recorded ─────────
  const steps: Step[] = [];
  if (!profile.intakeCompletedAt) {
    steps.push({
      href: "/patient/about",
      icon: <span className="step-icon calendar"><ClipboardCheck size={16} /></span>,
      title: "Tell us a little about you",
      detail: "About three minutes; no lab results needed"
    });
  }
  // The most urgent pathway option from the rules engine leads the list.
  const topOption = record?.options.find((o) => o.priority === 1);
  if (topOption) {
    steps.unshift({
      href: "/patient/assessment",
      icon: <span className="step-icon calendar"><Sparkles size={16} /></span>,
      title: topOption.title,
      detail: topOption.reason
    });
  }
  if (sex === "female") {
    steps.push({
      href: "/patient/wearables",
      icon: loggedTempToday ? (
        <span className="check-ring"><Check size={14} /></span>
      ) : (
        <span className="step-icon"><Thermometer size={16} /></span>
      ),
      title: loggedTempToday ? "Morning temperature logged" : "Log your morning temperature",
      detail:
        temps.length < MIN_BBT_READINGS
          ? `${temps.length} of ${MIN_BBT_READINGS} readings needed to see your pattern`
          : `${temps.length} readings recorded`,
      done: loggedTempToday
    });
  }
  if (sex === "male" && profile.spermCount === null) {
    steps.push({
      href: "/patient/assessment",
      icon: <span className="step-icon"><Droplets size={16} /></span>,
      title: "Add your semen analysis",
      detail: "Sperm concentration from your most recent lab report"
    });
  }
  steps.push({
    href: "/patient/wearables",
    icon: <span className="step-icon moon"><MoonStar size={16} /></span>,
    title: sleep && sleep.mean >= 7 ? "Keep up 7+ hours of sleep" : "Aim for 7+ hours of sleep",
    detail: sleep ? `${formatHours(sleep.mean)} average over ${sleep.nights} nights` : "Start logging sleep to see your average"
  });
  if (!isPaired) {
    steps.push({
      href: "/patient/pairing",
      icon: <span className="step-icon calendar"><HeartHandshake size={16} /></span>,
      title: "Link with a partner (optional)",
      detail: "Unlocks a joint estimate when you plan a pregnancy together"
    });
  }

  // ── Weekly insight banner ───────────────────────────────────────────────────
  let insightTitle: string;
  let insightText: string;
  let insightValue: string | null = null;
  let insightLabel = "";
  if (sex === "female") {
    if (bbt.status === "BIPHASIC") {
      insightTitle = "Your temperature shows a clear rise";
      insightText = `A sustained rise of ${bbt.shift.toFixed(2)}°C is consistent with ovulation. Keep logging so your care team can see your full pattern.`;
      insightValue = `+${bbt.shift.toFixed(2)}°C`;
      insightLabel = "Post-rise shift";
    } else if (bbt.status === "MONOPHASIC") {
      insightTitle = "No clear rise yet this cycle";
      insightText = "This is common and can vary from cycle to cycle. Your care team will look at it together with your other results.";
    } else {
      insightTitle = "Build your temperature pattern";
      insightText = `Log your temperature each morning before getting up. After ${MIN_BBT_READINGS} readings we can show whether a rise appears.`;
      insightValue = `${temps.length}/${MIN_BBT_READINGS}`;
      insightLabel = "Readings so far";
    }
  } else if (sex === "male") {
    if (profile.spermCount !== null) {
      const above = profile.spermCount >= WHO_SPERM_LOWER_LIMIT;
      insightTitle = above ? "Your semen analysis is within range" : "Your sperm count is worth discussing";
      insightText = above
        ? `${profile.spermCount} million/mL is above the WHO lower reference limit of ${WHO_SPERM_LOWER_LIMIT} million/mL. Sleep, weight and activity help keep it there.`
        : `${profile.spermCount} million/mL is below the WHO reference of ${WHO_SPERM_LOWER_LIMIT} million/mL. This is common, often improves with lifestyle changes, and your clinician can advise.`;
      insightValue = `${profile.spermCount}`;
      insightLabel = "million/mL";
    } else {
      insightTitle = "Add your semen analysis";
      insightText = "Enter the sperm concentration from your lab report to see how it compares with WHO reference values.";
    }
  } else {
    insightTitle = "Welcome to ReproAI";
    insightText = "Complete your assessment to see a personalised view of your reproductive health.";
  }

  return (
    <div className="content patient-content">
      <div className="patient-welcome">
        <div>
          <p className="date-label">
            {new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" }).toUpperCase()}
          </p>
          <h1>
            {greeting()}
            {name ? `, ${name}` : ""}
          </h1>
          <span>Here is what your recorded data shows so far.</span>
        </div>
      </div>

      {obsLoading ? (
        <div className="loading-block" style={{ height: 232, margin: "0 0 17px" }} aria-label="Loading your insight" />
      ) : (
      <section className="journey-banner">
        <div className="journey-copy">
          <div className="eyebrow light">
            <Sparkles size={14} /> YOUR INSIGHT
          </div>
          <h2>{insightTitle}</h2>
          <p>{insightText}</p>
          <Link href={sex === "male" && profile.spermCount === null ? "/patient/assessment" : "/patient/wearables"}>
            {sex === "male" && profile.spermCount === null ? "Add results" : "Explore your pattern"} <ArrowRight size={16} />
          </Link>
        </div>
        <div className="journey-art" aria-hidden="true">
          <svg viewBox="0 0 360 170">
            <path
              d="M16 132 C65 124, 74 107, 112 116 S164 142, 191 93 S243 80, 264 68 S313 55, 345 26"
              fill="none"
              stroke="#fff"
              strokeOpacity=".8"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M16 132 C65 124, 74 107, 112 116 S164 142, 191 93 S243 80, 264 68 S313 55, 345 26 L345 170 L16 170Z"
              fill="url(#patientGradient)"
              opacity=".35"
            />
            <defs>
              <linearGradient id="patientGradient" x1="0" x2="0" y1="0" y2="1">
                <stop stopColor="#fff" />
                <stop offset="1" stopColor="#fff" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
          {insightValue && (
            <div className="art-note">
              <span>{insightValue}</span>
              <small>{insightLabel}</small>
            </div>
          )}
        </div>
      </section>
      )}

      <section className="patient-grid">
        <article className="panel potential-card">
          <div className="panel-head">
            <div>
              <h2>{latestPrediction?.scope === "COUPLE" ? "Your joint estimate" : "Your reproductive picture"}</h2>
              <p>{latestPrediction ? `Reviewed by your clinician · ${shortDate(latestPrediction.createdAt)}` : "Not assessed yet"}</p>
            </div>
          </div>
          {latestPrediction && latestPrediction.scope !== "COUPLE" ? (
            <div className="empty-state">
              <span className="soft-pill"><Sparkles size={14} /> {tierCopy(latestPrediction.tier).label}</span>
              <strong>{tierCopy(latestPrediction.tier).summary || "Your clinician has reviewed your latest results."}</strong>
              {record?.assessments[0]?.percentile != null && sex === "female" && (
                <span>Your AMH is {percentileWords(record.assessments[0].percentile!)}.</span>
              )}
            </div>
          ) : latestPrediction ? (
            <div className="potential-body">
              <PotentialGauge probability={latestPrediction.probability} tier={latestPrediction.tier} />
              <div className="potential-copy">
                <span className="soft-pill">
                  <Sparkles size={14} /> {tierCopy(latestPrediction.tier).label}
                </span>
                <p>{tierCopy(latestPrediction.tier).summary || "An estimate to discuss with your care team, not a diagnosis."}</p>
                <ConfidenceBar low={latestPrediction.confidenceLow} high={latestPrediction.confidenceHigh} />
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <strong>{record?.pendingReview ? "A result is with your clinician" : "Your baseline comes from your clinician"}</strong>
              {record?.pendingReview
                ? "You will see it here once they have reviewed it and added a note for you."
                : "When your clinician records results such as an AMH test or a semen analysis and reviews them, your picture appears here."}
            </div>
          )}
          <Link className="full-link" href="/patient/assessment">
            View my trajectory <ArrowRight size={15} />
          </Link>
        </article>

        <article className="panel next-card">
          <div className="panel-head">
            <div>
              <h2>Your next best steps</h2>
              <p>Based on what you have recorded</p>
            </div>
          </div>
          <div className="steps-list">
            {obsLoading && <div className="loading-block" style={{ height: 150 }} />}
            {!obsLoading && steps.slice(0, 4).map((s) => (
              <Link key={s.title} href={s.href}>
                {s.icon}
                <span>
                  <strong>{s.title}</strong>
                  <small>{s.detail}</small>
                </span>
                <ChevronRight size={16} />
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="panel signals-card">
        <div className="panel-head">
          <div>
            <h2>Your health signals</h2>
            <p>{sex === "female" ? "Basal body temperature and sleep" : "Sleep, lifestyle and lab markers"}</p>
          </div>
          <Link className="text-button" href="/patient/wearables">
            View details <ArrowRight size={15} />
          </Link>
        </div>
        <div className="signal-grid">
          <div className="chart-area">
            {obsLoading ? (
              <div className="loading-block" style={{ margin: 0 }} />
            ) : sex === "female" && recentTemps.length >= 2 ? (
              <TemperatureChart points={recentTemps} analysis={recentBbt} />
            ) : sex !== "female" && recentSleep.length >= 2 && recentSleepStats ? (
              <SleepChart points={recentSleep} stats={recentSleepStats} />
            ) : (
              <div className="empty-state" style={{ padding: "8px 0" }}>
                <strong>{sex === "female" ? "No temperature readings yet" : "Track the habits that matter"}</strong>
                {sex === "female"
                  ? "Your temperature chart appears here once you log at least two morning readings."
                  : "Sleep, weight and activity influence sperm quality. Log your sleep to see trends here."}
                <Link className="text-button" href="/patient/wearables">
                  Log a measurement <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </div>
          <div className="signal-stats">
            {sex === "female" && (
              <Stat
                icon={<span className="stat-icon temp"><Thermometer size={17} /></span>}
                label={lastTemp && isToday(lastTemp.date) ? "Temperature today" : "Latest temperature"}
                value={lastTemp ? `${lastTemp.value.toFixed(2)}°C` : "Not logged"}
                note={lastTemp && !isToday(lastTemp.date) ? shortDate(lastTemp.date) : undefined}
              />
            )}
            {sex === "male" && (
              <Stat
                icon={<span className="stat-icon temp"><Droplets size={17} /></span>}
                label="Sperm concentration"
                value={profile.spermCount !== null ? `${profile.spermCount} M/mL` : "Not recorded"}
                note={profile.spermCount !== null ? (profile.spermCount >= WHO_SPERM_LOWER_LIMIT ? "In range" : "Below ref.") : undefined}
                good={profile.spermCount !== null && profile.spermCount >= WHO_SPERM_LOWER_LIMIT}
              />
            )}
            <Stat
              icon={<span className="stat-icon sleep"><MoonStar size={17} /></span>}
              label="Sleep last logged"
              value={sleep?.last != null ? formatHours(sleep.last) : "Not logged"}
              note={sleep?.last != null ? (sleep.last >= 7 ? "Good" : "Below 7h") : undefined}
              good={sleep?.last != null && sleep.last >= 7}
            />
            <Stat
              icon={<span className="stat-icon cycle">{sex === "female" ? <Activity size={17} /> : <Scale size={17} />}</span>}
              label={sex === "female" ? "Cycle regularity" : "Body mass index"}
              value={
                sex === "female"
                  ? profile.cycleRegularity
                    ? profile.cycleRegularity.charAt(0) + profile.cycleRegularity.slice(1).toLowerCase()
                    : "Not recorded"
                  : profile.bmi !== null
                    ? profile.bmi.toFixed(1)
                    : "Not recorded"
              }
              note={sex !== "female" && profile.bmi !== null ? (profile.bmi >= 20 && profile.bmi < 25 ? "In range" : "Target 20–24.9") : undefined}
              good={sex !== "female" && profile.bmi !== null && profile.bmi >= 20 && profile.bmi < 25}
            />
          </div>
        </div>
      </section>

      {!isPaired && (
        <section className="support-strip" style={{ marginTop: 16 }}>
          <div className="support-icon">
            <HeartHandshake size={21} />
          </div>
          <span>
            <strong>Planning a pregnancy together?</strong>
            <small>Link with your partner for a joint estimate. Your own records stay private, and you can unlink any time.</small>
          </span>
          <Link href="/patient/pairing">
            Link partner <ArrowRight size={15} />
          </Link>
        </section>
      )}
      {isPaired && partner && (
        <section className="support-strip" style={{ marginTop: 16 }}>
          <div className="support-icon">
            <CalendarDays size={21} />
          </div>
          <span>
            <strong>Linked with {firstName(partner.name) ?? partner.email}</strong>
            <small>You can run a joint assessment that combines both partners&apos; clinical factors.</small>
          </span>
          <Link href="/patient/assessment">
            Joint assessment <ArrowRight size={15} />
          </Link>
        </section>
      )}

      <section className="support-strip" style={{ marginTop: 12 }}>
        <div className="support-icon">
          <MessageCircle size={21} />
        </div>
        <span>
          <strong>Have a question about your journey?</strong>
          <small>ReproAI answers using WHO and ESHRE guidance, with your clinician in the loop.</small>
        </span>
        <Link href="/patient/assistant">
          Ask ReproAI <ArrowRight size={15} />
        </Link>
      </section>
    </div>
  );
}

function Stat({ icon, label, value, note, good }: { icon: ReactNode; label: string; value: string; note?: string; good?: boolean }) {
  return (
    <div>
      {icon}
      <span>
        <small>{label}</small>
        <strong>{value}</strong>
      </span>
      {note ? <em className={good ? "good" : ""}>{note}</em> : <em />}
    </div>
  );
}
