"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const links = [
  { href: "/clinician/dashboard", label: "Patients" },
  { href: "/clinician/protocols", label: "Protocols" },
  { href: "/clinician/follow-up", label: "Follow-up" }
];

export function ClinicianNav() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav className="flex flex-wrap items-center gap-4 border-b border-gray-200 bg-white px-8 py-4">
      <span className="font-semibold text-brand">ReproAI · Clinician</span>
      {links.map((l) => (
        <Link key={l.href} href={l.href} className="text-sm text-gray-600 hover:text-brand">
          {l.label}
        </Link>
      ))}
      <button
        onClick={handleLogout}
        className="ml-auto text-sm text-gray-500 hover:text-red-600"
      >
        Logout
      </button>
    </nav>
  );
}
