"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  estimateFertilityWindow,
  FertilityWindow,
  TemperatureObservation,
  SleepObservation
} from "@/lib/fertility-window";

export default function FertilityWindowPage() {
  const [lastPeriodStart, setLastPeriodStart] = useState("");
  const [cycleLengthDays, setCycleLengthDays] = useState("28");
  const [window, setWindow] = useState<FertilityWindow | null>(null);
  const [touched, setTouched] = useState(false);

  // Wearable observations fetched from the database
  const [temps, setTemps] = useState<TemperatureObservation[]>([]);
  const [sleepRecords, setSleepRecords] = useState<SleepObservation[]>([]);
  const [loadingObservations, setLoadingObservations] = useState(true);

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
      } finally {
        setLoadingObservations(false);
      }
    }

    loadCoupleObservations();
  }, []);

  function calculate() {
    setTouched(true);
    setWindow(
      estimateFertilityWindow({
        lastPeriodStart,
        cycleLengthDays: cycleLengthDays ? Number(cycleLengthDays) : undefined,
        temperatures: temps,
        sleepRecords: sleepRecords
      })
    );
  }

  return (
    <main className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-brand">Fertility window</h1>
        <Link
          href="/patient/wearables"
          className="text-xs font-medium text-brand hover:underline"
        >
          Manage Wearable Data →
        </Link>
      </div>

      <p className="text-sm text-gray-600">
        Calculate your biological fertile window. When Basal Body Temperature (BBT) observations
        are available from your wearables, the prediction is automatically calibrated to your true
        physiological thermal shift.
      </p>

      {/* ── Active Wearable Biomarkers Status Banner ── */}
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold uppercase tracking-wider text-gray-500">
            Detected Wearable Inputs:
          </span>
          <div className="flex flex-wrap gap-2">
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${
                temps.length > 0
                  ? "bg-teal-50 text-teal-700 border border-teal-200"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              🌡️ {temps.length} BBT Reading(s) {temps.length > 0 ? "Active" : "None"}
            </span>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-medium ${
                sleepRecords.length > 0
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              🌙 {sleepRecords.length} Sleep Record(s)
            </span>
          </div>
        </div>
      </div>

      <Card title="Cycle parameters">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col text-sm text-gray-700">
            First day of last period
            <input
              type="date"
              value={lastPeriodStart}
              onChange={(e) => setLastPeriodStart(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>
          <label className="flex flex-col text-sm text-gray-700">
            Average cycle length (days)
            <input
              type="number"
              min="20"
              max="45"
              value={cycleLengthDays}
              onChange={(e) => setCycleLengthDays(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </label>
        </div>
        <button
          onClick={calculate}
          disabled={!lastPeriodStart}
          className="mt-4 rounded-lg bg-brand px-6 py-2.5 text-sm font-medium text-white hover:opacity-95 disabled:opacity-50 transition-opacity"
        >
          Calculate Fertile Window
        </button>
      </Card>

      {window ? (
        <Card title="Personalized Fertile Window Result">
          {/* Method Badge */}
          <div className="mb-4">
            {window.method === "WEARABLE_CALIBRATED" ? (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-teal-300 bg-teal-50 px-3 py-1 text-xs font-semibold text-teal-800">
                <span className="h-2 w-2 rounded-full bg-teal-600 animate-pulse" />
                Biomarker Calibrated · Wearable BBT Shift Detected
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-gray-50 px-3 py-1 text-xs font-medium text-gray-700">
                Standard Calendar Estimate (14-day assumption)
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 mb-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <span className="text-xs uppercase tracking-wide text-gray-500">
                Estimated Ovulation
              </span>
              <p className="mt-1 text-2xl font-bold text-brand">{window.ovulationDate}</p>
              <p className="text-xs text-gray-500 mt-1">Peak probability of conception</p>
            </div>

            <div className="rounded-lg bg-teal-50/60 p-4 border border-teal-100">
              <span className="text-xs uppercase tracking-wide text-teal-800">
                Optimal Conception Window
              </span>
              <p className="mt-1 text-xl font-bold text-teal-900">
                {window.windowStart} <span className="text-sm font-normal text-gray-500">to</span>{" "}
                {window.windowEnd}
              </p>
              <p className="text-xs text-teal-700 mt-1">6-day fertile window (sperm &amp; ovum viability)</p>
            </div>
          </div>

          {/* Biological Calibration Breakdown */}
          {window.calibrationDetails && (
            <div className="mb-4 rounded-lg border border-teal-200 bg-teal-50/40 p-4 space-y-2">
              <p className="text-xs font-semibold text-teal-900 uppercase tracking-wider">
                Wearable Calibration Biomarkers:
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-700">
                <div>
                  <span className="text-gray-500">Follicular Baseline: </span>
                  <strong>{window.calibrationDetails.baselineTempCelsius} °C</strong>
                </div>
                <div>
                  <span className="text-gray-500">Ovulatory Temp: </span>
                  <strong>{window.calibrationDetails.ovulatoryTempCelsius} °C</strong>
                </div>
                <div>
                  <span className="text-gray-500">Thermal Shift: </span>
                  <strong className="text-teal-700">
                    +{window.calibrationDetails.shiftMagnitudeCelsius} °C
                  </strong>
                </div>
                <div>
                  <span className="text-gray-500">Shift Date: </span>
                  <strong>{window.calibrationDetails.shiftDate}</strong>
                </div>
              </div>
              {window.calibrationDetails.sleepQualityAssessment && (
                <p className="text-xs text-gray-600 pt-1 border-t border-teal-100">
                  🌙 {window.calibrationDetails.sleepQualityAssessment}
                </p>
              )}
            </div>
          )}

          <p className="text-xs text-gray-600 bg-gray-50 rounded p-3 border border-gray-100">
            {window.explanation}
          </p>

          {window.method === "CALENDAR_ONLY" && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-dashed border-teal-300 bg-teal-50/30 p-3">
              <span className="text-xs text-gray-700">
                Want higher accuracy? Log your morning basal temperature.
              </span>
              <Link
                href="/patient/wearables"
                className="text-xs font-semibold text-brand hover:underline"
              >
                Log Wearable Data →
              </Link>
            </div>
          )}

          <p className="mt-3 text-[11px] text-gray-400">
            Disclaimer: Estimates are educational clinical decision-support based on WHO/ACOG
            methodologies and do not replace medical diagnosis.
          </p>
        </Card>
      ) : (
        touched && (
          <EmptyState message="Enter your last period date and cycle length to calculate your fertile window." />
        )
      )}
    </main>
  );
}
