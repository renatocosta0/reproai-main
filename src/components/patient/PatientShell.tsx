"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { Activity, HeartHandshake, Home, Languages, LineChart, Lock, MessageCircle, PenLine, UserRound, Route } from "lucide-react";
import { PortalShell, type NavItem } from "@/components/portal/PortalShell";
import { useLocale } from "@/components/i18n/LocaleContext";
import type { StringKey } from "@/lib/i18n";
import { firstName, initials, usePatient } from "@/components/patient/PatientContext";
import { NotificationInbox } from "@/components/notifications/NotificationInbox";

// Primary nav follows the clinical flow; account-type pages sit in a secondary group.
const NAV: { href: string; key: StringKey; icon: NavItem["icon"]; dividerBefore?: boolean }[] = [
  { href: "/patient/overview", key: "navToday", icon: Home },
  { href: "/patient/journey", key: "navJourney", icon: Route },
  { href: "/patient/assessment", key: "navTrajectory", icon: LineChart },
  { href: "/patient/wearables", key: "navTracking", icon: Activity },
  { href: "/patient/assistant", key: "navAssistant", icon: MessageCircle },
  { href: "/patient/about", key: "navAbout", icon: PenLine, dividerBefore: true },
  { href: "/patient/pairing", key: "navCouple", icon: HeartHandshake },
  { href: "/patient/privacy", key: "navPrivacy", icon: Lock }
];

export function PatientShell({ children }: { children: ReactNode }) {
  const { data } = usePatient();
  const { locale, setLocale, t } = useLocale();
  const name = data?.profile.name ?? null;
  const partnerName = firstName(data?.partner?.name) ?? data?.partner?.email ?? "your partner";

  const modeBadge = data ? (
    <Link href="/patient/pairing" className={`mode-badge ${data.isPaired ? "paired" : ""}`}>
      {data.isPaired ? <HeartHandshake size={15} aria-hidden /> : <UserRound size={15} aria-hidden />}
      {data.isPaired ? `${t("pairedWith")} ${partnerName}` : t("individualMode")}
    </Link>
  ) : null;

  const topActions = (
    <>
      <button
        type="button"
        className="lang-toggle"
        onClick={() => setLocale(locale === "ar" ? "en" : "ar")}
        lang={locale === "ar" ? "en" : "ar"}
        aria-label={locale === "ar" ? "Switch to English" : "التبديل إلى العربية"}
      >
        <Languages size={15} aria-hidden /> {t("switchLanguage")}
      </button>
      <NotificationInbox />
      {modeBadge}
    </>
  );

  return (
    <PortalShell
      theme="patient"
      navLabel={t("navLabel")}
      nav={NAV.map((n) => ({ href: n.href, label: t(n.key), icon: n.icon, dividerBefore: n.dividerBefore }))}
      user={{
        name: name ?? t("yourAccount"),
        subtitle: data?.isPaired ? t("coupleWorkspace") : t("individualWorkspace"),
        initials: initials(name, "Me")
      }}
      topActions={topActions}
    >
      {locale === "ar" && <div className="translation-notice" role="note">{t("translationNotice")}</div>}
      {children}
    </PortalShell>
  );
}
