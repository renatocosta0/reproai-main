"use client";

import { useEffect, type ReactNode } from "react";
import { X } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleContext";
import { CLINICIAN_STRINGS } from "@/lib/i18n-clinician";

/** Dialog using the reference `.modal` styles. Closes on Escape and backdrop click. */
export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const { locale } = useLocale();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <button className="modal-close" onClick={onClose} aria-label={CLINICIAN_STRINGS[locale].close}>
          <X size={20} />
        </button>
        {children}
      </div>
    </div>
  );
}
