"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApiError, api, userMessage } from "@/lib/api-client";
import { Capacitor } from "@capacitor/core";
import type { ProfileResponse } from "@/types/patient";

interface PatientContextValue {
  data: ProfileResponse | null;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
}

const PatientContext = createContext<PatientContextValue | null>(null);

/** Loads /api/patient/profile once for the whole patient portal; pages call refresh() after changes. */
export function PatientProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [data, setData] = useState<ProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await api<ProfileResponse>("/api/patient/profile");
      setData(res);
      setError("");
    } catch (err) {
      setError(userMessage(err, "Could not load your profile."));
      if (Capacitor.isNativePlatform() && err instanceof ApiError && err.status === 401) {
        router.replace("/login");
      }
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <PatientContext.Provider value={{ data, loading, error, refresh }}>{children}</PatientContext.Provider>
  );
}

export function usePatient(): PatientContextValue {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error("usePatient must be used inside PatientProvider");
  return ctx;
}

export function firstName(name: string | null | undefined): string | null {
  const n = name?.trim();
  return n ? n.split(/\s+/)[0] : null;
}

export function initials(name: string | null | undefined, fallback = "?"): string {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (parts.length === 0) return fallback;
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}
