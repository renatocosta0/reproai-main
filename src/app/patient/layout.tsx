import type { ReactNode } from "react";
import { PatientProvider } from "@/components/patient/PatientContext";
import { PatientShell } from "@/components/patient/PatientShell";
import { LocaleProvider } from "@/components/i18n/LocaleContext";

// Access is enforced by src/middleware.ts (PATIENT role only).
export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <PatientProvider>
        <PatientShell>{children}</PatientShell>
      </PatientProvider>
    </LocaleProvider>
  );
}
