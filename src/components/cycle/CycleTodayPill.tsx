"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api-client";
import type { PatientCycleResponse } from "@/types/cycle";
import { CYCLE_COPY } from "./cycle-copy";

/** Compact "cycle day · phase" tile for the Today page; links to My cycle. */
export function CycleTodayPill({ locale }: { locale: "en" | "ar" }) {
  const L = CYCLE_COPY[locale];
  const [state, setState] = useState<{ day: number | null; phase: string } | null>(null);
  useEffect(() => {
    let alive = true;
    api<PatientCycleResponse>("/api/patient/cycle")
      .then((r) => alive && r.consented && setState({ day: r.analysis.prediction.cycleDay, phase: r.analysis.prediction.phase }))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);
  if (!state) return null;
  return (
    <Link href="/patient/cycle" className="cycle-pill" style={{ color: "inherit", textDecoration: "none" }}>
      <span>{L.cycleDay}</span>
      <strong>
        {state.day ?? "–"} <i>· {L.phase[state.phase] ?? state.phase}</i>
      </strong>
    </Link>
  );
}
