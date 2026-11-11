"use client";

import type { ReactNode } from "react";
import { Bell, BrainCircuit, LayoutDashboard, UserPlus } from "lucide-react";
import { PortalShell, type NavItem } from "@/components/portal/PortalShell";
import { useClinician } from "@/components/clinician/ClinicianContext";
import { PrescribeModal } from "@/components/clinician/PrescribeModal";

const NAV: NavItem[] = [
  { href: "/clinician/dashboard", label: "Cohort dashboard", icon: LayoutDashboard, match: ["/clinician/patient"] },
  { href: "/clinician/follow-up", label: "Triage & follow-up", icon: Bell },
  { href: "/clinician/assistant", label: "Clinical AI Copilot", icon: BrainCircuit }
];

export function ClinicianShell({ children }: { children: ReactNode }) {
  const { email, prescribeOpen, openPrescribe, closePrescribe } = useClinician();
  const local = email?.split("@")[0] ?? "";

  return (
    <>
      <PortalShell
        theme="clinician"
        navLabel="WORKSPACE"
        nav={NAV}
        user={{
          name: email ?? "Clinician",
          subtitle: "Licensed Specialist",
          initials: (local.slice(0, 2) || "Dr").toUpperCase()
        }}
        sidebarFooter={
          <div className="systems-card">
            <div>
              <span className="status-dot" /> Clinician access
            </div>
            <small>Every case view is audit-logged</small>
          </div>
        }
        topActions={
          <button className="primary compact" onClick={openPrescribe}>
            <UserPlus size={16} /> Prescribe digital care
          </button>
        }
      >
        {children}
      </PortalShell>
      {prescribeOpen && <PrescribeModal onClose={closePrescribe} />}
    </>
  );
}
