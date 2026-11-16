"use client";

import { useCallback, useEffect, useState } from "react";
import { api, userMessage } from "@/lib/api-client";
import type { PatientRecord } from "@/types/record";

/** The signed-in patient's longitudinal record (released results only). */
export function useRecord() {
  const [record, setRecord] = useState<PatientRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      setRecord(await api<PatientRecord>("/api/patient/record"));
      setError("");
    } catch (err) {
      setError(userMessage(err, "Could not load your record."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { record, loading, error, refresh };
}

/** Plain-language band for the AMH-for-age figure (50 = typical AMH for age, 25 = half;
 * a ratio, not a population percentile). */
export function percentileWords(p: number): string {
  if (p < 10) return "lower than most people your age";
  if (p < 25) return "towards the lower end of the typical range for your age";
  if (p <= 75) return "within the typical range for your age";
  return "towards the higher end of the typical range for your age";
}
