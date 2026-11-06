import { type SelectHTMLAttributes, type ReactNode } from "react";

export function Select({
  label,
  children,
  className = "",
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <span className="select-wrap">
        <select className={`input ${className}`} {...props}>
          {children}
        </select>
      </span>
    </label>
  );
}

