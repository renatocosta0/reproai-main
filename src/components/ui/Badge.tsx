import { type ReactNode } from "react";

export function Badge({
  children,
  neutral = false,
  className = "",
}: {
  children: ReactNode;
  neutral?: boolean;
  className?: string;
}) {
  return (
    <span className={`badge ${neutral ? "badge-neutral" : "badge-teal"} ${className}`}>
      {children}
    </span>
  );
}

export function StatusBadge({
  children,
  tone = "teal",
  className = "",
}: {
  children: ReactNode;
  tone?: "teal" | "emerald" | "amber" | "rose" | "slate";
  className?: string;
}) {
  return <span className={`badge status-badge badge-${tone} ${className}`}>{children}</span>;
}

