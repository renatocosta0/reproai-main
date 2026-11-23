import { cp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "mobile", ".next-source");
const output = path.join(root, "mobile", "dist");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");

async function readApiBase() {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  try {
    const envFile = await readFile(path.join(root, ".env.mobile"), "utf8");
    const value = envFile.match(/^\s*NEXT_PUBLIC_API_BASE_URL\s*=\s*(.*?)\s*$/m)?.[1];
    return value?.replace(/^(["'])(.*)\1$/, "$2") ?? null;
  } catch {
    return null;
  }
}

const apiBase = (await readApiBase())?.trim().replace(/\/+$/, "");
if (apiBase && !/^https:\/\//i.test(apiBase)) {
  console.error("NEXT_PUBLIC_API_BASE_URL must use HTTPS.");
  process.exit(1);
}

await rm(source, { recursive: true, force: true });
await rm(output, { recursive: true, force: true });
await mkdir(path.join(source, "src"), { recursive: true });

// Build from the production patient pages and shared components. API routes,
// clinician pages, and cookie middleware remain hosted by the normal Next app.
await cp(path.join(root, "src", "components"), path.join(source, "src", "components"), { recursive: true });
await cp(path.join(root, "src", "lib"), path.join(source, "src", "lib"), { recursive: true });
await cp(path.join(root, "src", "types"), path.join(source, "src", "types"), { recursive: true });
await cp(path.join(root, "src", "app", "patient"), path.join(source, "src", "app", "patient"), { recursive: true });
await cp(path.join(root, "src", "app", "(auth)"), path.join(source, "src", "app", "(auth)"), { recursive: true });
await cp(path.join(root, "src", "app", "layout.tsx"), path.join(source, "src", "app", "layout.tsx"));
for (const file of ["globals.css", "reproai.css", "landing.css", "chat-history.css"]) {
  await cp(path.join(root, "src", "app", file), path.join(source, "src", "app", file));
}
await cp(path.join(root, "public"), path.join(source, "public"), { recursive: true });
await cp(
  path.join(root, "mobile", "public", "privacypolicy.html"),
  path.join(source, "public", "privacypolicy.html")
);
await cp(path.join(root, "tsconfig.json"), path.join(source, "tsconfig.json"));
await cp(path.join(root, "next-env.d.ts"), path.join(source, "next-env.d.ts"));
await cp(path.join(root, "postcss.config.js"), path.join(source, "postcss.config.js"));
await cp(path.join(root, "postcss"), path.join(source, "postcss"), { recursive: true });
await cp(path.join(root, "tailwind.config.ts"), path.join(source, "tailwind.config.ts"));
await writeFile(path.join(source, "package.json"), JSON.stringify({ private: true, name: "reproai-native-patient-ui" }, null, 2));
await writeFile(path.join(source, "next.config.js"), `module.exports = { reactStrictMode: true, output: "export", trailingSlash: true, images: { unoptimized: true } };\n`);
await writeFile(
  path.join(source, "src", "app", "page.tsx"),
  `"use client";\nimport { useEffect } from "react";\nimport { useRouter } from "next/navigation";\nexport default function NativeHome() { const router = useRouter(); useEffect(() => router.replace("/login"), [router]); return null; }\n`
);

const appDir = path.join(source, "src", "app");
for (const entry of await readdir(appDir, { withFileTypes: true })) {
  if (entry.isDirectory() && entry.name !== "patient" && entry.name !== "(auth)") {
    await rm(path.join(appDir, entry.name), { recursive: true, force: true });
  }
}
await rm(path.join(source, "src", "app", "api"), { recursive: true, force: true });

// Static exports cannot ship Next middleware. API routes still enforce role,
// session, and consent checks on the hosted backend.
const env = { ...process.env, NEXT_PUBLIC_API_BASE_URL: apiBase ?? "" };
const result = await new Promise((resolve) => {
  const child = spawn(process.execPath, [nextBin, "build"], { cwd: source, env, stdio: "inherit" });
  child.on("error", (error) => resolve({ code: 1, error }));
  child.on("close", (code) => resolve({ code: code ?? 1 }));
});
if (result.code !== 0) {
  if (result.error) console.error(result.error);
  process.exit(result.code);
}

await mkdir(output, { recursive: true });
await cp(path.join(source, "out"), output, { recursive: true });
if (apiBase) {
  console.log(`Bundled existing patient portal screens for Capacitor using ${apiBase}.`);
} else {
  console.warn("Bundled the existing patient screens, but API calls will require a rebuild after NEXT_PUBLIC_API_BASE_URL is set in .env.mobile.");
}
