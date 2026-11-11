import type { InputHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: LucideIcon;
  hint?: ReactNode;
  /** Optional element rendered to the right of the label (e.g. a link). */
  aside?: ReactNode;
}

/** Labelled text input styled with the reference `.field` / `.input-wrap` classes. */
export function Field({ label, icon: Icon, hint, aside, id, ...input }: FieldProps) {
  const inputId = id ?? input.name;
  return (
    <label className="field" htmlFor={inputId}>
      {aside ? (
        <div className="field-label">
          <span>{label}</span>
          {aside}
        </div>
      ) : (
        <span>{label}</span>
      )}
      <div className="input-wrap">
        {Icon && <Icon size={17} aria-hidden />}
        <input id={inputId} {...input} />
      </div>
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}
