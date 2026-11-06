"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, IconName, Wordmark } from "@/components/ui/Icons";

const clinicianNavItems: { href: string; label: string; icon: IconName }[] = [
  { href: "/clinician/dashboard", label: "Patients", icon: "person" },
  { href: "/clinician/protocols", label: "Protocols", icon: "database" },
  { href: "/clinician/follow-up", label: "Follow-up", icon: "refresh" }
];

export function ClinicianNav() {
  const router = useRouter();
  const pathname = usePathname();

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    router.push("/");
    router.refresh();
  }

  return (
    <header className="app-header">
      <div className="app-nav">
        <Wordmark href="/clinician/dashboard" />
        <nav>
          {clinicianNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/clinician/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={isActive ? "active" : ""}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <button
          className="avatar-button clinician-avatar"
          onClick={handleLogout}
          title="Sign out / Switch account"
          type="button"
        >
          DR
        </button>
      </div>
    </header>
  );
}
