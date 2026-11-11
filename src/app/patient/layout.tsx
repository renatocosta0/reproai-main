import type { ReactNode } from "react";
import { PatientProvider } from "@/components/patient/PatientContext";
import { PatientShell } from "@/components/patient/PatientShell";

// Access is enforced by src/middleware.ts (PATIENT role only).
export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <PatientProvider>
      <PatientShell>{children}</PatientShell>
    </PatientProvider>
  );
}
