"use client";

import type { ReactNode } from "react";
import { Bell, FlaskConical, LayoutDashboard, MessageSquareText, UserPlus, UsersRound } from "lucide-react";
import { PortalShell, type NavItem } from "@/components/portal/PortalShell";
import { useClinician } from "@/components/clinician/ClinicianContext";
import { PrescribeModal } from "@/components/clinician/PrescribeModal";

const NAV: NavItem[] = [
  { href: "/clinician/dashboard", label: "Overview", icon: LayoutDashboard, match: ["/clinician/patient"] },
  { href: "/clinician/follow-up", label: "Follow-up board", icon: Bell },
  { href: "/clinician/insights", label: "Population insight", icon: UsersRound },
  { href: "/clinician/assistant", label: "Clinical copilot", icon: MessageSquareText },
  { href: "/clinician/evidence", label: "Evidence & safety", icon: FlaskConical }
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
          subtitle: "Clinical workspace",
          initials: (local.slice(0, 2) || "Dr").toUpperCase()
        }}
        sidebarFooter={
          <div className="systems-card">
            <div>
              <span className="status-dot" /> Your care panel only
            </div>
            <small>Every view and decision is audit-logged</small>
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
