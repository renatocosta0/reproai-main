"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { applyTheme, readThemePreference, storeThemePreference, type ThemePreference } from "@/lib/theme";

const OPTIONS: { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: "system", label: "System", icon: Monitor },
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon }
];

/** System / Light / Dark switch. The initial theme is applied before paint by layout.tsx. */
export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePreference>("system");

  useEffect(() => {
    setPref(readThemePreference());
  }, []);

  // While following the system, track OS-level changes live.
  useEffect(() => {
    if (pref !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [pref]);

  function choose(next: ThemePreference) {
    setPref(next);
    storeThemePreference(next);
    applyTheme(next);
  }

  return (
    <div className="theme-toggle" role="radiogroup" aria-label="Colour theme">
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={pref === value}
          className={pref === value ? "active" : ""}
          onClick={() => choose(value)}
          title={`${label} theme`}
        >
          <Icon size={14} aria-hidden />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
