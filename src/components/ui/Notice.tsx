import type { ReactNode } from "react";
import { Info } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export function ClinicalNotice({
  children,
  icon: Icon = Info
}: {
  children: ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="clinical-notice" role="note">
      <Icon size={16} aria-hidden />
      <span>{children}</span>
    </div>
  );
}

export function FormError({ children }: { children: ReactNode }) {
  return (
    <div className="form-error" role="alert">
      {children}
    </div>
  );
}
