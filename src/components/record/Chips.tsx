import { BadgeCheck, FlaskConical, Info, PenLine, Smartphone } from "lucide-react";
import { SOURCE_LABELS, type LabSource } from "@/lib/labs";

/** Where a value came from: clinician verified, self-reported, imported or undocumented. */
export function SourceChip({ source }: { source: string }) {
  const s = source as LabSource;
  const Icon = s === "CLINICIAN_VERIFIED" ? BadgeCheck : s === "SELF_REPORTED" ? PenLine : s === "IMPORTED" ? Smartphone : Info;
  return (
    <span className={`chip src-${s.toLowerCase()}`}>
      <Icon size={12} aria-hidden /> {SOURCE_LABELS[s] ?? source}
    </span>
  );
}

/** Evidence status of the model output, always shown with a result. */
export function EvidenceChip({ text }: { text?: string | null }) {
  return (
    <span className="chip evidence" title={text ?? undefined}>
      <FlaskConical size={12} aria-hidden /> {text ? "Prototype · not clinically validated" : "Prototype"}
    </span>
  );
}

/** Data completeness meter (0–1). */
export function Completeness({ value, missing }: { value: number | null; missing?: string[] }) {
  if (value === null) return null;
  const pct = Math.round(value * 100);
  return (
    <div className="completeness" title={missing?.length ? `Missing: ${missing.join(", ")}` : undefined}>
      <div className="completeness-head">
        <span>Data completeness</span>
        <strong>{pct}%</strong>
      </div>
      <div className="completeness-bar">
        <i style={{ width: `${pct}%` }} />
      </div>
      {missing && missing.length > 0 && <small>Not yet available: {missing.join(", ")}. The range is wider because of this.</small>}
    </div>
  );
}
