"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icons";
import {
  estimateFertilityWindow,
  FertilityWindow,
  TemperatureObservation,
  SleepObservation
} from "@/lib/fertility-window";

function BbtChart() {
  return (
    <div className="chart-wrap">
      <svg
        viewBox="0 0 620 220"
        role="img"
        aria-label="Basal body temperature chart showing a rise after ovulation"
      >
        <rect
          x="245"
          y="16"
          width="152"
          height="160"
          rx="4"
          fill="#ccfbf1"
          opacity=".65"
        />
        <g className="grid-lines">
          <path d="M48 28h540M48 78h540M48 128h540M48 178h540" />
        </g>
        <path
          className="chart-area"
          d="M48 143 82 149 116 138 150 146 184 132 218 142 252 136 286 125 320 131 354 91 388 82 422 77 456 70 490 75 524 61 558 66 588 57V178H48Z"
        />
        <polyline
          className="chart-line"
          points="48,143 82,149 116,138 150,146 184,132 218,142 252,136 286,125 320,131 354,91 388,82 422,77 456,70 490,75 524,61 558,66 588,57"
        />
        <line className="ovulation-line" x1="354" y1="20" x2="354" y2="178" />
        <text x="364" y="35">
          Ovulation
        </text>
        <text x="48" y="205">
          Day 1
        </text>
        <text x="300" y="205">
          Day 14
        </text>
        <text x="550" y="205">
          Day 28
        </text>
      </svg>
      <div className="chart-legend">
        <span>
          <i className="legend-band" />
          Fertile window
        </span>
        <span>
          <i className="legend-line" />
          BBT reading
        </span>
      </div>
    </div>
  );
}

export default function FertilityWindowPage() {
  const [lastPeriodStart, setLastPeriodStart] = useState("");
  const [cycleLengthDays, setCycleLengthDays] = useState("28");
  const [windowResult, setWindowResult] = useState<FertilityWindow | null>(null);
  const [calculated, setCalculated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Wearable observations fetched from database
  const [temps, setTemps] = useState<TemperatureObservation[]>([]);
  const [sleepRecords, setSleepRecords] = useState<SleepObservation[]>([]);

  useEffect(() => {
    async function loadCoupleObservations() {
      try {
        const sessionRes = await fetch("/api/auth/session");
        const sessionData = await sessionRes.json();
        if (!sessionRes.ok || !sessionData.session?.coupleId) return;

        const obsRes = await fetch(`/api/observations?coupleId=${sessionData.session.coupleId}`);
        if (obsRes.ok) {
          const data = await obsRes.json();
          const observations: Array<{ code: string; value: number; effectiveAt: string }> =
            data.observations || [];

          const tObs = observations
            .filter((o) => o.code === "8310-5")
            .map((o) => ({ date: o.effectiveAt, value: o.value }));

          const sObs = observations
            .filter((o) => o.code === "93832-4")
            .map((o) => ({ date: o.effectiveAt, hours: o.value }));

          setTemps(tObs);
          setSleepRecords(sObs);
        }
      } catch (err) {
        console.error("Could not load wearable observations", err);
      }
    }

    loadCoupleObservations();
  }, []);

  function handleCalculate() {
    if (!lastPeriodStart) {
      setError("Please select the first day of your last period.");
      return;
    }
    setError(null);
    const res = estimateFertilityWindow({
      lastPeriodStart,
      cycleLengthDays: cycleLengthDays ? Number(cycleLengthDays) : undefined,
      temperatures: temps,
      sleepRecords: sleepRecords
    });
    setWindowResult(res);
    setCalculated(true);
  }

  const isBiomarkerCalibrated = Boolean(windowResult?.thermalShiftDetected);

  return (
    <main className="page-main">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Patient workspace</p>
          <h1>Fertility window</h1>
        </div>
        <Link href="/patient/wearables" className="state-link">
          Manage wearable data →
        </Link>
      </div>

      <div className="record-chips">
        <span>
          <Icon name="thermometer" />
          {temps.length} BBT Reading(s) Active
        </span>
        <span>
          <Icon name="moon" />
          {sleepRecords.length} Sleep Record(s)
        </span>
      </div>

      <div className="fertility-grid">
        <Card className="parameters-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Your cycle</p>
              <h2>Cycle parameters</h2>
            </div>
          </div>
          <p className="muted" style={{ marginTop: 6, marginBottom: 16 }}>
            Enter your cycle details to estimate your most fertile days.
          </p>
          <div className="parameter-form">
            <Input
              label="First day of last period"
              type="date"
              value={lastPeriodStart}
              onChange={(e) => {
                setLastPeriodStart(e.target.value);
                if (error) setError(null);
              }}
              required
            />
            <Input
              label="Average cycle length (days)"
              type="number"
              min="20"
              max="45"
              value={cycleLengthDays}
              onChange={(e) => setCycleLengthDays(e.target.value)}
              required
            />

            {error && <p className="form-error">{error}</p>}

            <Button onClick={handleCalculate} className="full-button">
              Calculate Fertile Window
            </Button>
          </div>
        </Card>

        {calculated && windowResult ? (
          <Card className="result-card">
            <div className="result-header">
              <div>
                <p className="eyebrow">Your result</p>
                <h2>Personalized Fertile Window Result</h2>
              </div>
              {isBiomarkerCalibrated ? (
                <span className="calibrated-badge">
                  <i />
                  Biomarker Calibrated · Wearable BBT Shift Detected
                </span>
              ) : (
                <Badge neutral>Standard Calendar Estimate (14-day assumption)</Badge>
              )}
            </div>
            <div className="result-highlights">
              <div>
                <span>Estimated Ovulation</span>
                <strong>
                  {new Date(windowResult.ovulationDate).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric"
                  })}
                </strong>
              </div>
              <div>
                <span>Optimal Conception Window</span>
                <strong>
                  {`${windowResult.windowStart.slice(8, 10)}/${windowResult.windowStart.slice(5, 7)} to ${windowResult.windowEnd.slice(8, 10)}/${windowResult.windowEnd.slice(5, 7)}`}
                </strong>
              </div>
            </div>

            {isBiomarkerCalibrated && (
              <>
                <BbtChart />
                <div className="mini-stats">
                  <div>
                    <span>Follicular BBT</span>
                    <strong>
                      {windowResult.calibrationDetails?.baselineTempCelsius
                        ? `${windowResult.calibrationDetails.baselineTempCelsius.toFixed(2)} °C`
                        : "—"}
                    </strong>
                  </div>
                  <div>
                    <span>Thermal shift</span>
                    <strong>
                      {windowResult.calibrationDetails?.shiftMagnitudeCelsius
                        ? `+${windowResult.calibrationDetails.shiftMagnitudeCelsius.toFixed(2)} °C`
                        : "—"}
                    </strong>
                  </div>
                  <div>
                    <span>Shift date</span>
                    <strong>
                      {windowResult.calibrationDetails?.shiftDate
                        ? new Date(windowResult.calibrationDetails.shiftDate).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short"
                          })
                        : "—"}
                    </strong>
                  </div>
                  <div>
                    <span>Sleep quality</span>
                    <strong>
                      {windowResult.calibrationDetails?.sleepQualityAssessment ?? "—"}
                    </strong>
                  </div>
                </div>
              </>
            )}

            <p className="disclaimer">
              <Icon name="info" size={15} />
              This estimate is informational and should not replace clinical advice or contraception.
            </p>
          </Card>
        ) : (
          <Card className="result-card" style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", minHeight: 300 }}>
            <span style={{ color: "#0f766e", marginBottom: 12 }}>
              <Icon name="calendar" size={32} />
            </span>
            <h3 style={{ fontSize: 17, fontWeight: 650, color: "#0f172a" }}>Ready to calculate</h3>
            <p style={{ fontSize: 13, color: "#64748b", maxWidth: 360, marginTop: 4 }}>
              Enter the first day of your last period above to view your fertile window and ovulation forecast.
            </p>
          </Card>
        )}
      </div>
    </main>
  );
}
