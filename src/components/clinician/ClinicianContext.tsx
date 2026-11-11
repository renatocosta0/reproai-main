"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

interface ClinicianContextValue {
  email: string | null;
  prescribeOpen: boolean;
  openPrescribe: () => void;
  closePrescribe: () => void;
  /** Increments whenever data changes (e.g. a new prescription) so pages can refetch. */
  version: number;
  bump: () => void;
}

const ClinicianContext = createContext<ClinicianContextValue | null>(null);

export function ClinicianProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(null);
  const [prescribeOpen, setPrescribeOpen] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setEmail(d?.email ?? null))
      .catch(() => setEmail(null));
  }, []);

  const openPrescribe = useCallback(() => setPrescribeOpen(true), []);
  const closePrescribe = useCallback(() => setPrescribeOpen(false), []);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  return (
    <ClinicianContext.Provider value={{ email, prescribeOpen, openPrescribe, closePrescribe, version, bump }}>
      {children}
    </ClinicianContext.Provider>
  );
}

export function useClinician(): ClinicianContextValue {
  const ctx = useContext(ClinicianContext);
  if (!ctx) throw new Error("useClinician must be used inside ClinicianProvider");
  return ctx;
}
