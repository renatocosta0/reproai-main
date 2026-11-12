import { AlertTriangle, ClipboardList, FlaskConical, HeartPulse, Leaf, MessagesSquare, Snowflake, Stethoscope } from "lucide-react";
import type { OptionKind, PathwayOption } from "@/lib/pathways";

const KIND: Record<OptionKind, { label: string; Icon: typeof Leaf; tone: string }> = {
  RED_FLAG: { label: "See a doctor", Icon: AlertTriangle, tone: "coral" },
  REFER: { label: "Specialist", Icon: Stethoscope, tone: "coral" },
  TEST: { label: "Testing", Icon: FlaskConical, tone: "amber" },
  PRESERVATION: { label: "Preservation", Icon: Snowflake, tone: "blue" },
  COUNSEL: { label: "Talk it through", Icon: MessagesSquare, tone: "teal" },
  OPTIMISE: { label: "Your health", Icon: Leaf, tone: "mint" }
};

/** Pathway options from the rules engine. `audience` picks patient or clinician wording. */
export function OptionsList({
  options,
  audience,
  intendedUse,
  limit
}: {
  options: PathwayOption[];
  audience: "patient" | "clinician";
  intendedUse?: string;
  limit?: number;
}) {
  const shown = limit ? options.slice(0, limit) : options;
  return (
    <div className="options-list">
      {shown.map((o) => {
        const k = KIND[o.kind];
        return (
          <article key={o.ruleId} className={`option-item tone-${k.tone} p${o.priority}`}>
            <span className="option-icon">
              <k.Icon size={17} aria-hidden />
            </span>
            <div>
              <div className="option-top">
                <span className="option-kind">{k.label}</span>
                {o.priority === 1 && <span className="option-soon">Act soon</span>}
                {audience === "clinician" && <code>{o.ruleId}</code>}
              </div>
              <strong>{o.title}</strong>
              <p>{audience === "patient" ? o.patientText : o.clinicianText}</p>
              <small>
                <ClipboardList size={12} aria-hidden /> Why: {o.reason} · Source: {o.source}
              </small>
            </div>
          </article>
        );
      })}
      {intendedUse && (
        <p className="options-boundary">
          <HeartPulse size={13} aria-hidden /> {intendedUse}
        </p>
      )}
    </div>
  );
}
