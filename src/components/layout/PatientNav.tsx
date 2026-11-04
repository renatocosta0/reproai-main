"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

const links = [
  { href: "/patient/dashboard", label: "Overview" },
  { href: "/patient/assistant", label: "Assistant" },
  { href: "/patient/fertility-window", label: "Fertility window" },
  { href: "/patient/wearables", label: "Wearables" },
  { href: "/patient/lifestyle", label: "Lifestyle" },
  { href: "/patient/data-entry", label: "My data" }
];

export function PatientNav() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav className="flex flex-wrap items-center gap-4 border-b border-gray-200 bg-white px-8 py-4">
      <span className="font-semibold text-brand">ReproAI</span>
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
