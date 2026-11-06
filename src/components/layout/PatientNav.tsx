"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Icon, IconName, Wordmark } from "@/components/ui/Icons";

const navItems: { href: string; label: string; icon: IconName }[] = [
  { href: "/patient/dashboard", label: "Overview", icon: "chart" },
  { href: "/patient/assistant", label: "Assistant", icon: "spark" },
  { href: "/patient/fertility-window", label: "Fertility window", icon: "calendar" },
  { href: "/patient/wearables", label: "Wearables", icon: "heart" },
  { href: "/patient/lifestyle", label: "Lifestyle", icon: "leaf" },
  { href: "/patient/data-entry", label: "My data", icon: "database" }
];

export function PatientNav() {
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
        <Wordmark href="/patient/dashboard" />
        <nav>
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/patient/dashboard" && pathname?.startsWith(item.href));
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
          className="avatar-button"
          onClick={handleLogout}
          title="Sign out / Switch account"
          type="button"
        >
          PA
        </button>
      </div>
    </header>
  );
}
