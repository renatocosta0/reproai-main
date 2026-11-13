/** Colour theme preference. "system" follows prefers-color-scheme. */
export type ThemePreference = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "reproai-theme";

/**
 * Runs in <head> before first paint (see app/layout.tsx) so the page never flashes
 * the wrong theme. Keep it dependency-free and in sync with applyTheme() below.
 */
export const THEME_INIT_SCRIPT = `(function(){var p;try{p=localStorage.getItem("${THEME_STORAGE_KEY}")}catch(e){}var d=p==="dark"||(p!=="light"&&window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")})()`;

export function readThemePreference(): ThemePreference {
  try {
    const v = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (v === "light" || v === "dark") return v;
  } catch {
    /* storage blocked: fall back to the system setting */
  }
  return "system";
}

export function storeThemePreference(pref: ThemePreference) {
  try {
    if (pref === "system") window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, pref);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
}

export function applyTheme(pref: ThemePreference) {
  const dark = pref === "dark" || (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}
