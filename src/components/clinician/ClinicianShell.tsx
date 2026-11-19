"use client";

import type { ReactNode } from "react";
import { Bell, FlaskConical, Languages, LayoutDashboard, MessageSquareText, UserPlus, UsersRound } from "lucide-react";
import { PortalShell, type NavItem } from "@/components/portal/PortalShell";
import { useClinician } from "@/components/clinician/ClinicianContext";
import { PrescribeModal } from "@/components/clinician/PrescribeModal";
import { useClinicianText } from "@/components/clinician/useClinicianText";
import { NotificationSubscriber } from "@/components/patient/NotificationSubscriber";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";

type NavKey = "navOverview" | "navFollowUp" | "navInsights" | "navCopilot" | "navEvidence";

const NAV: (Omit<NavItem, "label"> & { key: NavKey })[] = [
  { href: "/clinician/dashboard", key: "navOverview", icon: LayoutDashboard, match: ["/clinician/patient"] },
  { href: "/clinician/follow-up", key: "navFollowUp", icon: Bell },
  { href: "/clinician/insights", key: "navInsights", icon: UsersRound },
  { href: "/clinician/assistant", key: "navCopilot", icon: MessageSquareText },
  { href: "/clinician/evidence", key: "navEvidence", icon: FlaskConical }
];

export function ClinicianShell({ children }: { children: ReactNode }) {
  const { email, prescribeOpen, openPrescribe, closePrescribe } = useClinician();
  const { L, ar, setLocale } = useClinicianText();
  const local = email?.split("@")[0] ?? "";

  return (
    <>
      <NotificationSubscriber />
      <PortalShell
        theme="clinician"
        navLabel={L.navLabel}
        nav={NAV.map(({ key, ...n }) => ({ ...n, label: L[key] }))}
        user={{
          name: email ?? L.clinician,
          subtitle: L.workspace,
          initials: (local.slice(0, 2) || "Dr").toUpperCase()
        }}
        sidebarFooter={
          <div className="systems-card">
            <div>
              <span className="status-dot" /> {L.panelOnly}
            </div>
            <small>{L.auditLogged}</small>
          </div>
        }
        topActions={
          <>
            <button
              type="button"
              className="lang-toggle"
              onClick={() => setLocale(ar ? "en" : "ar")}
              lang={ar ? "en" : "ar"}
              aria-label={L.switchAria}
            >
              <Languages size={15} aria-hidden /> {L.switchLanguage}
            </button>
            <NotificationInbox />
            <button className="primary compact" onClick={openPrescribe}>
              <UserPlus size={16} /> {L.prescribe}
            </button>
          </>
        }
      >
        {ar && <div className="translation-notice" role="note">{L.translationNotice}</div>}
        {children}
      </PortalShell>
      {prescribeOpen && <PrescribeModal onClose={closePrescribe} />}
    </>
  );
}
