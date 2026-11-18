import type { ReactNode } from "react";
import { PatientProvider } from "@/components/patient/PatientContext";
import { PatientShell } from "@/components/patient/PatientShell";
import { LocaleProvider } from "@/components/i18n/LocaleContext";
import { NotificationSubscriber } from "@/components/patient/NotificationSubscriber";
import { AskProvider } from "@/components/patient/AskPanel";

// Access is enforced by src/middleware.ts (PATIENT role only).
export default function PatientLayout({ children }: { children: ReactNode }) {
  return (
    <LocaleProvider>
      <PatientProvider>
        <NotificationSubscriber />
        <AskProvider>
          <PatientShell>{children}</PatientShell>
        </AskProvider>
      </PatientProvider>
    </LocaleProvider>
  );
}
