/**
 * PostCSS plugin: derives the dark theme from the light stylesheet.
 *
 * reproai.css carries ~400 hand-tuned colours. Instead of hand-mapping each one (and
 * forgetting every new one), this plugin reads every colour declaration and emits a
 * dark twin right after the rule it came from:
 *
 *   .card { background: #fff; color: #173330 }
 *   :where([data-theme="dark"]) .card { background: #1a2b29; color: #e9f1ee }
 *
 * `:where()` adds no specificity and the twin sits immediately after its original, so
 * the dark cascade mirrors the light one exactly. Light mode output is untouched.
 *
 * How a colour is mapped depends on its role (OKLCH lightness L, chroma C):
 *  - surfaces (background): pale, low-chroma fills flip to deep teal-ink surfaces
 *    (white cards stay a step lighter than the page); saturated and dark fills
 *    (teal buttons, chart segments, the login panel) keep their colour.
 *  - text (color): dark ink becomes light; brand teal / coral text is lightened for
 *    contrast on dark surfaces; text that is already light (on teal fills) is kept.
 *  - borders: pale hairlines become dark hairlines; accent borders are kept.
 *  - translucent colours (alpha < 0.6) are kept: tints and veils work on both themes.
 *
 * Semantic tokens for things the plugin cannot see (inline SVG charts, the theme
 * toggle) are defined by hand in globals.css under [data-theme="dark"].
 * Opt a rule out with a `/* dark-theme: ignore *\/` comment inside it.
 */

const BRAND_VARS = {
  "--ink": "#173330",
  "--muted": "#71817d",
  "--line": "#e3eae6",
  "--teal": "#0c655e",
  "--teal-dark": "#094f49",
  "--mint": "#dff2e9",
  "--coral": "#de7467",
  "--cream": "#f8f5ef"
};

const ROLE_BY_PROP = (prop) => {
  if (prop.startsWith("--")) return null;
  if (prop === "background" || prop === "background-color" || prop === "background-image") return "bg";
  if (prop === "color" || prop === "-webkit-text-fill-color" || prop === "caret-color" || prop === "text-decoration-color" || prop === "fill") return "fg";
  if (prop.startsWith("border") || prop.startsWith("outline") || prop === "stroke" || prop === "scrollbar-color" || prop === "column-rule") return "border";
  if (prop === "box-shadow" || prop === "text-shadow") return "shadow";
  if (prop === "accent-color") return "accent";
  return null;
};

/* ---------- colour maths (sRGB <-> OKLab/OKLCH) ---------- */

const toLin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGam = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function rgbToOklch([r, g, b]) {
  const R = toLin(r), G = toLin(g), B = toLin(b);
  const l = Math.cbrt(0.4122214708 * R + 0.5363325363 * G + 0.0514459929 * B);
  const m = Math.cbrt(0.2119034982 * R + 0.6806995451 * G + 0.1073969566 * B);
  const s = Math.cbrt(0.0883024619 * R + 0.2817188376 * G + 0.6299787005 * B);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const bb = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const C = Math.hypot(a, bb);
  const h = ((Math.atan2(bb, a) * 180) / Math.PI + 360) % 360;
  return { L, C, h };
}

function oklchToRgbRaw({ L, C, h }) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
  ].map(toGam);
}

/** Reduce chroma until the colour fits in sRGB. */
function oklchToRgb(c) {
  let C = c.C;
  for (let i = 0; i < 40; i++) {
    const rgb = oklchToRgbRaw({ ...c, C });
    if (rgb.every((v) => v >= -0.0005 && v <= 1.0005)) return rgb.map((v) => Math.min(1, Math.max(0, v)));
    C *= 0.92;
  }
  return oklchToRgbRaw({ ...c, C: 0 }).map((v) => Math.min(1, Math.max(0, v)));
}

const hex2 = (v) => Math.round(v * 255).toString(16).padStart(2, "0");

function parseColor(str) {
  const s = str.trim().toLowerCase();
  if (s === "white") return { rgb: [1, 1, 1], a: 1 };
  if (s === "black") return { rgb: [0, 0, 0], a: 1 };
  if (s.startsWith("#")) {
    let h = s.slice(1);
    if (h.length === 3 || h.length === 4) h = h.split("").map((x) => x + x).join("");
    const n = (i) => parseInt(h.slice(i, i + 2), 16) / 255;
    return { rgb: [n(0), n(2), n(4)], a: h.length === 8 ? n(6) : 1 };
  }
  const m = s.match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    let a = 1;
    if (m[4] !== undefined) a = m[4].endsWith("%") ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { rgb: [m[1], m[2], m[3]].map((v) => parseFloat(v) / 255), a };
  }
  return null;
}

function formatColor(rgb, a) {
  const base = `#${rgb.map(hex2).join("")}`;
  return a >= 0.999 ? base : base + hex2(a);
}

/** Piecewise-linear interpolation through [x, y] anchors (x ascending). */
function interp(anchors, x) {
  if (x <= anchors[0][0]) return anchors[0][1];
  for (let i = 1; i < anchors.length; i++) {
    const [x1, y1] = anchors[i];
    const [x0, y0] = anchors[i - 1];
    if (x <= x1) return y0 + ((x - x0) / (x1 - x0)) * (y1 - y0);
  }
  return anchors[anchors.length - 1][1];
}

// Default hue for neutral surfaces: the brand's deep teal-ink.
const INK_HUE = 182;

// Lightness of pale surfaces in dark mode. White cards (L=1) sit a step above the page
// canvas (#f5f8f6, L~0.975), which sits above tinted wells (mint, coral-light).
const SURFACE_ANCHORS = [
  [0.7, 0.42],
  [0.8, 0.35],
  [0.88, 0.32],
  [0.93, 0.28],
  [0.965, 0.25],
  [0.98, 0.237],
  [0.99, 0.252],
  [1.0, 0.27]
];
const TEXT_ANCHORS = [
  [0.0, 0.95],
  [0.3, 0.935],
  [0.4, 0.89],
  [0.5, 0.84],
  [0.6, 0.78],
  [0.7, 0.72],
  [0.8, 0.68]
];
const BORDER_ANCHORS = [
  [0.6, 0.5],
  [0.75, 0.43],
  [0.85, 0.39],
  [0.93, 0.35],
  [0.99, 0.33],
  [1.0, 0.27]
];

function mapSurface({ L, C, h }) {
  if (L < 0.7 || (C > 0.075 && L < 0.9)) return null; // brand / data fills: keep
  return { L: interp(SURFACE_ANCHORS, L), C: Math.min(Math.max(C * 1.15, 0.014), 0.045), h: C < 0.006 ? INK_HUE : h };
}

function mapText({ L, C, h }) {
  if (L >= 0.8) return null; // already light (sits on a teal / coral fill): keep
  const outL = Math.max(L, interp(TEXT_ANCHORS, L));
  // Near-white ink keeps only a hint of its hue; lightened accents keep theirs.
  const outC = C < 0.006 ? 0.01 : outL > 0.9 ? Math.min(C * 0.45, 0.04) : Math.min(C, 0.13);
  return { L: outL, C: outC, h: C < 0.006 ? INK_HUE : h };
}

function mapBorder({ L, C, h }) {
  if (L < 0.6 || C > 0.075) return null;
  return { L: interp(BORDER_ANCHORS, L), C: Math.min(Math.max(C * 1.3, 0.012), 0.05), h: C < 0.006 ? INK_HUE : h };
}

function mapColor(raw, role) {
  const parsed = parseColor(raw);
  if (!parsed) return raw;
  if (parsed.a < 0.6) return raw; // translucent tints and veils read fine on both themes
  const lch = rgbToOklch(parsed.rgb);
  let out = null;
  if (role === "bg") out = mapSurface(lch);
  else if (role === "fg") out = mapText(lch);
  else if (role === "border") out = mapBorder(lch);
  else if (role === "shadow") out = lch.L > 0.7 ? mapSurface(lch) : null;
  else if (role === "accent") out = lch.L < 0.55 ? { ...lch, L: 0.72 } : null;
  if (!out) return raw;
  return formatColor(oklchToRgb(out), parsed.a);
}

const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\brgba?\([^)]*\)|\b(?:white|black)\b/g;
const VAR_RE = /var\((--[a-z-]+)\)/g;

/** Dark twin of a declaration value, or null when the colour is kept as is. */
function darkValue(value, role) {
  const resolved = value.replace(VAR_RE, (m, name) => BRAND_VARS[name] || m);
  const mapped = resolved.replace(COLOR_RE, (c) => mapColor(c, role));
  return mapped === resolved ? null : mapped;
}

function darkSelector(sel) {
  const s = sel.trim();
  const m = s.match(/^(:root|html)(?=$|[\s.:#[>+~])/);
  if (m) return `${m[1]}:where([data-theme="dark"])${s.slice(m[1].length)}`;
  return `:where([data-theme="dark"]) ${s}`;
}

module.exports = () => ({
  postcssPlugin: "reproai-dark-theme",
  OnceExit(root, { Rule }) {
    const rules = [];
    root.walkRules((rule) => {
      if (rule.parent && rule.parent.type === "atrule" && /keyframes$/i.test(rule.parent.name)) return;
      if (rule.selectors.some((s) => s.includes("data-theme"))) return;
      rules.push(rule);
    });
    for (const rule of rules) {
      if (rule.nodes.some((n) => n.type === "comment" && n.text.includes("dark-theme: ignore"))) continue;
      const decls = [];
      rule.each((node) => {
        if (node.type !== "decl") return;
        const role = ROLE_BY_PROP(node.prop);
        if (!role) return;
        const v = darkValue(node.value, role);
        if (v !== null) decls.push(node.clone({ value: v }));
      });
      if (!decls.length) continue;
      const twin = new Rule({ selectors: rule.selectors.map(darkSelector) });
      decls.forEach((d) => twin.append(d));
      rule.after(twin);
    }
  }
});
module.exports.postcss = true;
module.exports._test = { mapColor, darkSelector };
