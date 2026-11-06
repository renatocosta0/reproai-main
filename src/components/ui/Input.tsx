import { type InputHTMLAttributes } from "react";

export function Input({
  label,
  error,
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <input className={`input ${error ? "input-error" : ""} ${className}`} {...props} />
    </label>
  );
}

