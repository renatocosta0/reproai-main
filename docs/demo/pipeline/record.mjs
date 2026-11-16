// Story recorder: phone scenes for Reem, desktop scenes for the doctor.
// Chrome screencast frames -> 30 fps MP4, drawn cursor (arrow on desktop, touch dot on phone),
// eased scrolling, waits for AI answers squeezed to a short pause, and per-scene time markers.
// Usage: node record3.mjs <outDir> [scene ...]
import { chromium } from "playwright-core";
import { mkdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const B = "http://localhost:3123";
const OUT = process.argv[2];
const ONLY = process.argv.slice(3);
const EMAIL = process.env.EMAIL_HTML; // file:// URL of the rendered invitation email
mkdirSync(OUT, { recursive: true });
const DESK = { width: 1600, height: 900 };
const PHONE = { width: 390, height: 844 };
const marksAll = {};

const CURSOR = (touch) => `
(() => {
  const touch = ${touch};
  const install = () => {
    if (document.getElementById("__demo_cursor")) return;
    const c = document.createElement("div");
    c.id = "__demo_cursor";
    c.innerHTML = touch
      ? '<div style="width:34px;height:34px;border-radius:50%;background:rgba(23,51,48,.18);border:2px solid rgba(255,255,255,.9);box-shadow:0 2px 8px rgba(0,0,0,.2)"></div>'
      : '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l15 9.5-6.6 1.4 3.9 7.3-2.9 1.6-3.9-7.4L4 19z" fill="#173330" stroke="#fff" stroke-width="1.4" stroke-linejoin="round"/></svg>';
    const off = touch ? 17 : 3;
    Object.assign(c.style, { position: "fixed", left: "0", top: "0", zIndex: 2147483647, pointerEvents: "none", transform: "translate(-200px,-200px)", filter: touch ? "" : "drop-shadow(0 2px 3px rgba(0,0,0,.25))" });
    document.documentElement.appendChild(c);
    // keep the compositor producing frames so still moments are captured at their real length
    const tick = document.createElement("div");
    Object.assign(tick.style, { position: "fixed", right: "0", bottom: "0", width: "2px", height: "2px", zIndex: 2147483645, pointerEvents: "none", background: "rgba(255,255,255,0.02)" });
    document.documentElement.appendChild(tick);
    let on = false; setInterval(() => { on = !on; tick.style.background = on ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.02)"; }, 33);
    const p = window.__demoPos; if (p) c.style.transform = "translate(" + (p.x - off) + "px," + (p.y - off) + "px)";
    document.addEventListener("mousemove", (e) => { window.__demoPos = { x: e.clientX, y: e.clientY }; c.style.transform = "translate(" + (e.clientX - off) + "px," + (e.clientY - off) + "px)"; }, true);
    document.addEventListener("mousedown", (e) => {
      const r = document.createElement("div");
      Object.assign(r.style, { position: "fixed", left: e.clientX - 18 + "px", top: e.clientY - 18 + "px", width: "36px", height: "36px", borderRadius: "50%", background: "rgba(12,101,94,.28)", zIndex: 2147483646, pointerEvents: "none", transition: "transform .45s ease-out, opacity .45s ease-out" });
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = "scale(1.8)"; r.style.opacity = "0"; });
      setTimeout(() => r.remove(), 500);
    }, true);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
})();`;

const browser = await chromium.launch({ executablePath: "/usr/bin/chromium" });

async function scene(name, persona, mobile, fn) {
  if (ONLY.length && !ONLY.includes(name)) return;
  const VIEW = mobile ? PHONE : DESK;
  const dir = join(OUT, "_frames_" + name);
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext(mobile
    ? { viewport: PHONE, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "en-GB" }
    : { viewport: DESK, deviceScaleFactor: 1.2, locale: "en-GB" });
  await ctx.addInitScript(CURSOR(mobile));
  if (persona) {
    const r = await ctx.request.post(`${B}/api/auth/demo`, { data: { persona } });
    if (!r.ok()) throw new Error(`${persona} login ${r.status()}`);
  }
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  const frames = [];
  let n = 0, recording = false, shift = 0, pausedAt = null, lastTs = null;
  const marks = {};
  cdp.on("Page.screencastFrame", async ({ data, metadata, sessionId }) => {
    cdp.send("Page.screencastFrameAck", { sessionId }).catch(() => {});
    lastTs = metadata.timestamp;
    if (!recording) return;
    const file = join(dir, `f${String(n++).padStart(5, "0")}.jpg`);
    writeFileSync(file, Buffer.from(data, "base64"));
    frames.push({ file, t: metadata.timestamp - shift });
  });
  const now = () => (frames.length ? (lastTs - shift) - frames[0].t : 0);
  const S = {
    page, VIEW,
    async start() {
      await cdp.send("Page.startScreencast", mobile
        ? { format: "jpeg", quality: 92, maxWidth: 1170, maxHeight: 2532, everyNthFrame: 1 }
        : { format: "jpeg", quality: 92, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
      recording = true;
      await page.waitForTimeout(300);
    },
    pause() { recording = false; pausedAt = lastTs; },
    async resume(keep = 0.7) { if (pausedAt !== null) { shift += Math.max(0, (lastTs - pausedAt) - keep); pausedAt = null; } recording = true; await page.waitForTimeout(60); },
    mark(label) { marks[label] = +now().toFixed(2); }
  };
  const m = makeMouse(page, VIEW);
  try {
    await fn(S, m);
  } finally {
    await page.waitForTimeout(500);
    recording = false;
    await cdp.send("Page.stopScreencast").catch(() => {});
    await ctx.close();
    const list = frames.map((f, i) => `file '${f.file}'\nduration ${Math.max(0.001, ((frames[i + 1]?.t ?? f.t + 0.5) - f.t)).toFixed(4)}\n`).join("") + `file '${frames.at(-1).file}'\n`;
    writeFileSync(join(dir, "list.txt"), list);
    const scale = mobile ? "scale=1170:-2:flags=lanczos" : "scale=1920:1080:flags=lanczos";
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", join(dir, "list.txt"),
      "-vf", `${scale},fps=30,format=yuv420p`, "-c:v", "libx264", "-crf", "16", "-preset", "medium", join(OUT, `${name}.mp4`)]);
    marksAll[name] = marks;
    writeFileSync(join(OUT, "marks.json"), JSON.stringify(marksAll, null, 1));
    console.log("recorded", name, frames.length, "frames", JSON.stringify(marks));
  }
}

function makeMouse(page, VIEW) {
  let cur = { x: VIEW.width * 0.6, y: VIEW.height * 0.55 };
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  async function glide(x, y, ms = 700) {
    const steps = Math.max(12, Math.round(ms / 16));
    const from = { ...cur };
    const bow = Math.min(50, Math.hypot(x - from.x, y - from.y) * 0.08);
    for (let i = 1; i <= steps; i++) {
      const t = ease(i / steps);
      await page.mouse.move(from.x + (x - from.x) * t + Math.sin(Math.PI * t) * bow * 0.6, from.y + (y - from.y) * t - Math.sin(Math.PI * t) * bow);
      await page.waitForTimeout(16);
    }
    cur = { x, y };
  }
  async function scroll(dy, ms = 1400) {
    await page.evaluate(([dy, ms]) => new Promise((done) => {
      const y0 = window.scrollY, t0 = performance.now();
      const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
      const step = (now) => { const t = Math.min(1, (now - t0) / ms); window.scrollTo(0, y0 + dy * ease(t)); t < 1 ? requestAnimationFrame(step) : done(); };
      requestAnimationFrame(step);
    }), [dy, ms]);
  }
  async function to(locator, ms) {
    await locator.waitFor({ timeout: 45000 });
    let b = await locator.boundingBox();
    if (b && (b.y < 90 || b.y + b.height > VIEW.height - 90)) {
      await scroll(b.y - VIEW.height * 0.42, 1200);
      b = await locator.boundingBox();
    }
    await glide(b.x + Math.min(b.width / 2, 160), b.y + b.height / 2, ms);
  }
  return {
    show: () => page.mouse.move(cur.x, cur.y), glide, to, scroll,
    async click(locator, ms) { await to(locator, ms); await page.waitForTimeout(180); await page.mouse.down(); await page.waitForTimeout(90); await page.mouse.up(); },
    async type(locator, text) { await this.click(locator); await page.keyboard.type(text, { delay: 40 }); }
  };
}

async function open(S, m, url, ready) {
  await S.page.goto(url.startsWith("file:") ? url : B + url, { waitUntil: "networkidle" });
  if (ready) await S.page.getByText(ready).first().waitFor({ timeout: 45000 });
  await S.page.waitForTimeout(800);
  await m.show();
  await S.start();
  await S.page.waitForTimeout(600);
}
const T = (p, re) => p.getByText(re).first();

// ── Act 1 · Reem on her phone ──────────────────────────────────────────
await scene("m-today", "FEMALE", true, async (S, m) => {
  await open(S, m, "/patient/overview", /Good (morning|afternoon|evening), Reem/);
  await S.page.waitForTimeout(1200);
  await m.scroll(420, 2200);
  await S.page.waitForTimeout(1500);
});
await scene("m-email", null, true, async (S, m) => {
  await open(S, m, EMAIL, /invited you/);
  await S.page.waitForTimeout(1600);
  await m.to(T(S.page, /Create your account/), 900);
  await S.page.waitForTimeout(800);
  await m.scroll(330, 1800);
  await S.page.waitForTimeout(1500);
});
await scene("m-about", "FEMALE", true, async (S, m) => {
  await open(S, m, "/patient/about", /A little about you/);
  await m.to(T(S.page, "Not now"), 900);
  await S.page.waitForTimeout(500);
  await m.to(T(S.page, /interested in learning about egg/), 800);
  await S.page.waitForTimeout(700);
  await m.to(T(S.page, "Regular"), 900);
  await S.page.waitForTimeout(600);
  await m.to(T(S.page, /Health history/), 900);
  await S.page.waitForTimeout(1200);
});
await scene("m-privacy", "FEMALE", true, async (S, m) => {
  await open(S, m, "/patient/privacy", /You decide who sees what/);
  await m.to(T(S.page, /Our promise/), 900);
  await S.page.waitForTimeout(1200);
  const sw = S.page.locator('[role="switch"]').last();
  await m.to(sw, 1200);
  await S.page.waitForTimeout(500);
  await m.click(sw);
  await S.page.waitForTimeout(1300);
  await m.click(sw);
  await S.page.waitForTimeout(1500);
});

await scene("m-devices", "FEMALE", true, async (S, m) => {
  // Real import through the device endpoint (Health Connect sample shape), deleted after recording.
  const day = (d) => new Date(Date.UTC(2026, 10, d, 4, 45)).toISOString();
  const r = await S.page.request.post(B + "/api/observations/import", { data: { source: "HEALTH_CONNECT", samples: [13, 14, 15].map((d, i) => ({
    dataType: "basalBodyTemperature", value: [36.71, 36.74, 36.69][i], unit: "celsius", startDate: day(d), endDate: day(d), sourceName: "Health Connect demo", platformId: `demo-video-hc-${d}` })) } });
  console.log("import", r.status());
  // The recording browser has no Web Bluetooth; Chrome on Android does. Expose the API so the real panel shows
  // its Connect button. No device, connection or reading is simulated.
  await S.page.context().addInitScript(() => { if (!("bluetooth" in navigator)) Object.defineProperty(navigator, "bluetooth", { value: { requestDevice: () => Promise.reject(Object.assign(new Error("No device chosen"), { name: "NotFoundError" })) } }); });
  await open(S, m, "/patient/wearables", /Your health patterns/);
  await m.to(S.page.getByRole("button", { name: /Bluetooth thermometer/ }).first(), 900);
  await S.page.waitForTimeout(300);
  await m.click(S.page.getByRole("button", { name: /Bluetooth thermometer/ }).first());
  await S.page.waitForTimeout(1200);
  await m.to(S.page.getByText(/standard Bluetooth health thermometer profile/).first(), 900);
  await S.page.waitForTimeout(900);
  await m.to(S.page.getByRole("button", { name: /Connect thermometer/ }).first(), 900);
  await S.page.waitForTimeout(1300);
  await m.to(S.page.getByText(/^From: /).first(), 1400);
  await S.page.waitForTimeout(2200);
});

// ── Act 2 · the doctor ─────────────────────────────────────────────────
await scene("d-dashboard", "CLINICIAN", false, async (S, m) => {
  await open(S, m, "/clinician/dashboard", /Cohort outlook/);
  for (const re of [/People in care/, /Assessed/, /Awaiting your review/, /Open alerts/]) { await m.to(T(S.page, re), 800); await S.page.waitForTimeout(650); }
  await m.to(T(S.page, /Priority follow-ups/), 900);
  await S.page.waitForTimeout(1200);
});
await scene("d-followup", "CLINICIAN", false, async (S, m) => {
  await open(S, m, "/clinician/follow-up", /Follow-up board/);
  await m.to(T(S.page, /Alert raised/), 800);
  await S.page.waitForTimeout(500);
  await m.to(T(S.page, /monophasic|no sustained rise|Temperature/), 1000);
  await S.page.waitForTimeout(1600);
  for (const re of [/Appointment scheduled/, /In follow-up/, /^Closed$/]) { await m.to(T(S.page, re), 900); await S.page.waitForTimeout(700); }
  await m.to(T(S.page, /in stage/), 1000);
  await S.page.waitForTimeout(1500);
});
await scene("d-insights", "CLINICIAN", false, async (S, m) => {
  await open(S, m, "/clinician/insights", /Who would benefit from earlier advice/);
  await m.to(T(S.page, /In the preservation discussion window/), 1000);
  await S.page.waitForTimeout(1200);
  await m.to(T(S.page, /Reduced ovarian reserve/), 900);
  await S.page.waitForTimeout(900);
  await m.to(T(S.page, /Groups smaller than 5/), 1100);
  await S.page.waitForTimeout(1600);
});
await scene("d-reem", "CLINICIAN", false, async (S, m) => {
  await open(S, m, "/clinician/patient/demo-female", /Laboratory and ultrasound results/);
  await m.to(T(S.page, /Talk through egg freezing/), 1000);
  await S.page.waitForTimeout(1000);
  await m.to(T(S.page, /Daman Thiqa ART/), 900);
  await S.page.waitForTimeout(900);
  await m.to(T(S.page, "Clinician verified"), 1000);
  await S.page.waitForTimeout(1400);
});
await scene("d-copilot", "CLINICIAN", false, async (S, m) => {
  await open(S, m, "/clinician/assistant?case=demo-female", /Explain a case/);
  const box = S.page.getByPlaceholder(/Ask about this case/).first();
  const countSources = () => S.page.evaluate(() => [...document.querySelectorAll("*")].filter((e) => e.children.length === 0 && /^\d+ sources?$/.test(e.textContent.trim())).length);
  const before = await countSources();
  await m.type(box, "What should I cover with Reem at her next visit?");
  await S.page.keyboard.press("Enter");
  await S.page.waitForTimeout(900);
  S.pause();
  await S.page.waitForFunction((n) => [...document.querySelectorAll("*")].filter((e) => e.children.length === 0 && /^\d+ sources?$/.test(e.textContent.trim())).length > n, before, { timeout: 120000 }).catch(() => {});
  await S.page.waitForTimeout(800);
  await S.resume(0.8);
  S.mark("answer");
  await S.page.waitForTimeout(1500);
  await m.scroll(260, 1600);
  await S.page.waitForTimeout(2200);
  const src = S.page.getByText(/^\d+ sources?$/).last();
  if (await src.count()) { await m.to(src, 900); await S.page.waitForTimeout(1600); }
  S.mark("propose");
  await m.click(S.page.getByRole("button", { name: /Propose next action/ }).first());
  S.pause();
  await T(S.page, /needs your approval|No action proposed/).waitFor({ timeout: 60000 }).catch(() => {});
  await S.page.waitForTimeout(500);
  await S.resume(0.6);
  await S.page.waitForTimeout(1200);
  await m.to(T(S.page, /Approve & open follow-up/), 1000);
  await S.page.waitForTimeout(1800);
  await m.click(S.page.getByRole("button", { name: /Approve & open follow-up/ }).first());
  await S.page.waitForTimeout(2500);
});
await scene("d-assess", "CLINICIAN", false, async (S, m) => {
  await open(S, m, "/clinician/patient/demo-female", /Laboratory and ultrasound results/);
  await m.click(S.page.getByRole("button", { name: /Run individual assessment/ }).first());
  S.pause();
  await T(S.page, /Awaiting your review/).waitFor({ timeout: 60000 });
  await S.page.waitForTimeout(600);
  await S.resume(0.6);
  S.mark("result");
  const inputs = T(S.page, /Recorded inputs/);
  await m.scroll(await inputs.evaluate((e) => e.getBoundingClientRect().top - 150), 1800);
  await m.to(inputs, 900);
  await S.page.waitForTimeout(700);
  await m.to(S.page.getByText("Clinician verified").last(), 900);
  await S.page.waitForTimeout(700);
  await m.to(T(S.page, /Calculated result/), 900);
  await S.page.waitForTimeout(700);
  await m.to(T(S.page, /95% range/), 900);
  await S.page.waitForTimeout(1200);
  await m.to(T(S.page, /Prototype · not clinically validated/), 1000);
  await S.page.waitForTimeout(1200);
  const factors = T(S.page, /Time trying to conceive|Body mass index/);
  await m.to(factors, 1000);
  await S.page.waitForTimeout(1500);
  S.mark("note");
  const note = S.page.locator("textarea").first();
  await m.type(note, "Your egg reserve is in the typical range for your age. Happy to talk through egg-freezing timing at your next visit.");
  await S.page.waitForTimeout(700);
  await m.click(S.page.getByRole("button", { name: /Approve and release to patient/ }).first());
  await S.page.waitForTimeout(2600);
});
await scene("d-layla", "CLINICIAN", false, async (S, m) => {
  await open(S, m, "/clinician/patient/demo-missing", /Pathway triggers/);
  await m.click(S.page.getByRole("button", { name: /Run individual assessment/ }).first());
  await T(S.page, /No estimate: required information is missing/).waitFor({ timeout: 30000 });
  await S.page.waitForTimeout(600);
  await m.to(T(S.page, /No estimate: required information is missing/), 900);
  await S.page.waitForTimeout(1200);
  await m.to(T(S.page, /Consider an ovarian reserve test/), 900);
  await S.page.waitForTimeout(1500);
});

// ── Act 3 · back to Reem ───────────────────────────────────────────────
await scene("m-trajectory", "FEMALE", true, async (S, m) => {
  await open(S, m, "/patient/assessment", /How your picture is changing/);
  await S.page.waitForTimeout(1000);
  await m.to(T(S.page, /From your clinician/), 1000);
  await S.page.waitForTimeout(1300);
  await m.scroll(600, 2400);
  await S.page.waitForTimeout(800);
  await m.to(T(S.page, /Talk through egg freezing/), 1200);
  await S.page.waitForTimeout(1800);
});
await scene("m-arabic", "FEMALE", true, async (S, m) => {
  await open(S, m, "/patient/assessment", /How your picture is changing/);
  await m.click(S.page.getByRole("button", { name: /التبديل إلى العربية/ }).first());
  await S.page.waitForTimeout(1800);
  await m.scroll(380, 2000);
  await S.page.waitForTimeout(1400);
});
await scene("m-assistant", "FEMALE", true, async (S, m) => {
  await open(S, m, "/patient/assistant", /Ask ReproAI/);
  await m.scroll(500, 1600);
  await m.click(S.page.getByRole("button", { name: /social egg freezing under Thiqa/ }).first());
  await S.page.waitForTimeout(900);
  S.pause();
  await S.page.waitForFunction(() => /checked against its source/i.test(document.body.innerText), null, { timeout: 120000 }).catch(() => {});
  await S.page.waitForTimeout(800);
  await S.resume(0.8);
  await S.page.waitForTimeout(1200);
  await m.scroll(500, 1800);
  await S.page.waitForTimeout(2200);
});

// ── Close ──────────────────────────────────────────────────────────────
await scene("d-evidence", "CLINICIAN", false, async (S, m) => {
  await open(S, m, "/clinician/evidence", /Live measures from your panel/);
  await m.to(T(S.page, /Signal → appointment/), 1000);
  await S.page.waitForTimeout(1200);
  await m.to(T(S.page, /Referral acted on|Flagged for referral/), 900);
  await S.page.waitForTimeout(900);
  await m.scroll(520, 2200);
  await S.page.waitForTimeout(1400);
});

await browser.close();
