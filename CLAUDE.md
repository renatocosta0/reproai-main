# ReproAI

Fertility / reproductive-potential platform for the Abu Dhabi Future Health Digital
Innovation Challenge (DoH / ADPHC / Inception / MBZUAI), Fertility track, Challenge 02.
Individual-first, couple-ready, physician-prescribed (B2B2C).

**Spec: [NewPrompt.md](NewPrompt.md)** (section 0 and the 5A roadmap first), backed by
[docs/challenge-02-benchmark.md](docs/challenge-02-benchmark.md): the official Challenge 02
brief, the reference-demo patterns and the gap analysis. Prototype deadline: 20 Nov 2026.

## Stack (main app)
- Next.js 14 App Router, React 18, TypeScript strict, Tailwind CSS **v3**
  (`tailwind.config.ts` + `@tailwind` directives in `src/app/globals.css`).
- Import alias `@/*` → `src/*`. API routes live in `src/app/api/**/route.ts`.
- Prisma (`prisma/schema.prisma`), JWT cookie auth (`src/lib/auth.ts`), role gating in
  `src/middleware.ts` (`/patient/*` = PATIENT, `/clinician/*` = CLINICIAN, else → `/login`).
- ML: FastAPI in `ml-service/main.py` (the one the app calls via `ML_API_URL`).
  `ml/` is a legacy sklearn pipeline with no dataset; ignore it.

## Design reference
`Build ReproAI Fertility Platform/` is a **Figma Make export (Vite, React 19, Tailwind v4)**.
Use it as a *visual* reference only: port look and layout, not code or config.
Its `AGENTS.md` describes Figma Make's environment and does not apply here.
Do not copy Tailwind v4 syntax (`@import "tailwindcss"`, `@theme`) into this app.
It is excluded from `tsconfig.json`.

- Colors: teal `#0c655e`, teal-dark `#094f49`, mint `#dff2e9`, coral `#de7467`,
  cream `#f8f5ef`, canvas `#f5f8f6`, ink `#173330`, muted `#71817d`, line `#e3eae6`.
- Fonts: Manrope (headings), DM Sans (body). Load with `next/font/google`.
- Icons: `lucide-react` (not yet in package.json; add it).
- Tone: calm, clinical, warm. No hospital blue, no pastel pink. Mint = positive /
  protective factors, coral = risk factors.

## Hard rules
- **No mocked data in the UI.** Every number, row, and chart point comes from `/api/*`.
  Show real empty states when there is no data.
- **No open patient sign-up.** Patients register only with `?token=` from a clinician
  invite or partner pairing link. The login page has no "Create account" link.
- **Sex-adaptive patient UI** from `profile.sex`: female (AMH, AFC, BBT, oocyte
  preservation), male (semen params, lifestyle, sperm banking), paired (joint view).
- **No deterministic "fertility score" framing.** Show probability with its 95% CI, tier,
  explanation (SHAP factors), and limitations. Avoid alarming language.
- `"use client"` only where hooks/state are needed; keep pages server components otherwise.
- `npx tsc --noEmit` must pass with 0 errors before calling work done.

## Commands
```bash
npm install            # also runs prisma generate
npm run dev            # http://localhost:3000
npx tsc --noEmit       # type check
npm run lint
cd ml-service && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
```

## Known issues (don't be surprised)
- `prisma/migrations/` predates the move to PostgreSQL; use `npx prisma db push` (additive changes only on the shared DB, and ask first).
- `src/lib/encryption.ts` exists but nothing calls it; data is not encrypted at rest.
- `prisma/seed.ts` creates `clinician@reproai.dev`; `npm run demo:setup` creates the demo personas (needs the ML service).
- No automated tests yet (`vitest` is installed); end-to-end checks have been run as scripts.

## P0 safety rules (keep them true)
- The ML service never imputes a missing required input; it returns `insufficient_data`.
- Assessments are created only by clinicians from the record (`/api/clinician/cases/:id/assess`) as DRAFTs; patients see only RELEASED ones.
- Every value carries provenance (`LabResult.source`, `Prediction.inputs`); patients cannot write lab values.
- Consent (`src/lib/consent.ts`) is enforced in the API; clinicians are scoped by `src/lib/clinician-scope.ts`.
- No performance claims anywhere; label evidence status.
