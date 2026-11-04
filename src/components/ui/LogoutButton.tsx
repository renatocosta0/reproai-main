"use client";

import { useRouter } from "next/navigation";

interface LogoutButtonProps {
  className?: string;
  redirectTo?: string;
  children?: React.ReactNode;
}

export function LogoutButton({
  className = "text-sm text-gray-500 hover:text-red-600",
  redirectTo = "/login",
  children = "Logout"
}: LogoutButtonProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push(redirectTo);
    router.refresh();
  }

  return (
    <button onClick={handleLogout} className={className} type="button">
      {children}
    </button>
  );
}

