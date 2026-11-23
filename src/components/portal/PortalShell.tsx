"use client";

import { Fragment, useState, type ReactNode } from "react";
import Link from "next/link";
import { Capacitor } from "@capacitor/core";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X, type LucideIcon } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { TourBar } from "@/components/tour/TourBar";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { useLocale } from "@/components/i18n/LocaleContext";
import { CLINICIAN_STRINGS } from "@/lib/i18n-clinician";
import { api, clearMobileAccessToken } from "@/lib/api-client";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  badge?: number;
  /** Other path prefixes that should highlight this item (e.g. detail pages). */
  match?: string[];
  /** Show a hairline above this item to separate a secondary group. */
  dividerBefore?: boolean;
}

interface PortalShellProps {
  theme: "patient" | "clinician";
  navLabel: string;
  nav: NavItem[];
  user: { name: string; subtitle: string; initials: string };
  /** Extra content above the profile row (e.g. a status card). */
  sidebarFooter?: ReactNode;
  /** Right side of the top bar. */
  topActions?: ReactNode;
  children: ReactNode;
}

/** Sidebar + top bar layout from the Figma reference, shared by both portals. */
export function PortalShell({ theme, navLabel, nav, user, sidebarFooter, topActions, children }: PortalShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const L = CLINICIAN_STRINGS[useLocale().locale];
  const current = nav.find(
    (n) =>
      pathname === n.href ||
      pathname.startsWith(n.href + "/") ||
      (n.match ?? []).some((m) => pathname === m || pathname.startsWith(m + "/"))
  );

  async function logout() {
    setSigningOut(true);
    if (Capacitor.isNativePlatform()) {
      clearMobileAccessToken();
    } else {
      await api("/api/auth/logout", { method: "POST" }).catch(() => null);
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className={`app-shell ${theme}-theme`}>
      {mobileOpen && <button className="sidebar-scrim" onClick={() => setMobileOpen(false)} aria-label={L.closeMenu} />}
      <aside className={`sidebar ${theme === "patient" ? "patient-side" : ""} ${mobileOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <Logo />
          <button className="mobile-close" onClick={() => setMobileOpen(false)} aria-label={L.closeMenu}>
            <X size={20} />
          </button>
        </div>
        <nav aria-label={L.mainNav}>
          <small className="nav-label">{navLabel}</small>
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item === current;
            return (
              <Fragment key={item.href}>
                {item.dividerBefore ? <hr className="nav-divider" aria-hidden /> : null}
                <Link
                  href={item.href}
                  className={active ? "active" : ""}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon size={18} aria-hidden />
                  <span>{item.label}</span>
                  {item.badge ? <b>{item.badge}</b> : null}
                </Link>
              </Fragment>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          {sidebarFooter}
          <ThemeToggle />
          <div className="profile-row">
            <div className={`avatar ${theme === "patient" ? "peach" : ""}`} aria-hidden>
              {user.initials}
            </div>
            <span>
              <strong>{user.name}</strong>
              <small>{user.subtitle}</small>
            </span>
            <button className="logout-button" onClick={logout} disabled={signingOut} title={L.signOut} aria-label={L.signOut}>
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <div className="main-shell">
        <header className="topbar">
          <button className="menu-button" onClick={() => setMobileOpen(true)} aria-label={L.openMenu}>
            <Menu size={21} />
          </button>
          <span className="topbar-title">{current?.label ?? ""}</span>
          <div className="top-actions">{topActions}</div>
        </header>
        <main>{children}</main>
      </div>
      <TourBar />
    </div>
  );
}
