"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, ClipboardList, HeartHandshake, Home, MessageCircle, UserRound } from "lucide-react";
import { PortalShell, type NavItem } from "@/components/portal/PortalShell";
import { firstName, initials, usePatient } from "@/components/patient/PatientContext";

const NAV: NavItem[] = [
  { href: "/patient/overview", label: "Today", icon: Home },
  { href: "/patient/assessment", label: "My trajectory", icon: ClipboardList },
  { href: "/patient/wearables", label: "Home tracking", icon: Activity },
  { href: "/patient/assistant", label: "Ask ReproAI", icon: MessageCircle },
  { href: "/patient/pairing", label: "Couple link", icon: HeartHandshake }
];

export function PatientShell({ children }: { children: ReactNode }) {
  const { data } = usePatient();
  const name = data?.profile.name ?? null;
  const partnerName = firstName(data?.partner?.name) ?? data?.partner?.email ?? "your partner";

  const modeBadge = data ? (
    <Link href="/patient/pairing" className={`mode-badge ${data.isPaired ? "paired" : ""}`}>
      {data.isPaired ? <HeartHandshake size={15} aria-hidden /> : <UserRound size={15} aria-hidden />}
      {data.isPaired ? `Paired with ${partnerName}` : "Individual mode"}
    </Link>
  ) : null;

  return (
    <PortalShell
      theme="patient"
      navLabel="YOUR JOURNEY"
      nav={NAV}
      user={{
        name: name ?? "Your account",
        subtitle: data?.isPaired ? "Couple workspace" : "Individual workspace",
        initials: initials(name, "Me")
      }}
      topActions={modeBadge}
    >
      {children}
    </PortalShell>
  );
}
