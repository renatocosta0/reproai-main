// Small display helpers shared by the portals.

export function timeAgo(iso: string | Date): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const h = Math.round(min / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d === 1) return "yesterday";
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function daysSince(iso: string | Date): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 86400000));
}

/** Initials for a case: "Maya & Omar" -> "MO", "Lina Haddad" -> "LH". */
export function caseInitials(name: string): string {
  const parts = name.split(/\s+/).filter((p) => p && p !== "&");
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function usd(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `$${Math.round(n / 1000)}k`;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

/** Response bands used on the clinician dashboard (match the reference design). */
export function band(probability: number): "high" | "moderate" | "low" {
  return probability >= 60 ? "high" : probability >= 35 ? "moderate" : "low";
}

/** Short form of an alert note for compact lists: its first clause, capped. */
export function shortReason(note: string | null): string {
  if (!note) return "Alert raised";
  const first = note.split(" | ")[0].split(": ").slice(-1)[0].split(". ")[0];
  return first.length > 90 ? first.slice(0, 87) + "…" : first;
}

/** Display name for a set of patients, falling back to emails. */
export function peopleName(patients: { name: string | null }[], emails: string[] = []): string {
  return patients.map((p) => p.name).filter(Boolean).join(" & ") || emails[0] || "Unnamed case";
}
