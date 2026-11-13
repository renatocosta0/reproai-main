import type { ReactNode } from "react";
import { ClinicianProvider } from "@/components/clinician/ClinicianContext";
import { ClinicianShell } from "@/components/clinician/ClinicianShell";
import { LocaleProvider } from "@/components/i18n/LocaleContext";
import "./clinician-rtl.css";

// Access is enforced by src/middleware.ts (CLINICIAN role only).
export default function ClinicianLayout({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <ClinicianProvider>
        <ClinicianShell>{children}</ClinicianShell>
      </ClinicianProvider>
    </LocaleProvider>
  );
}
