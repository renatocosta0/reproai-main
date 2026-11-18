"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/**
 * A "More" button that reveals secondary actions, so a page shows one main action
 * instead of a row of equal buttons. Closes on outside click, Escape or choosing an item.
 */
export function MoreMenu({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="more-menu" ref={ref}>
      <button type="button" className="secondary" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        {label} <ChevronDown size={15} aria-hidden />
      </button>
      {open && (
        // Clicking any item closes the menu; items keep their own behaviour.
        <div className="more-menu-list" role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}
