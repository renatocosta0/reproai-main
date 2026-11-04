# ReproAI

Personalized fertility success prediction and infertility management platform, focused on PCOS and male factor, treating infertility as a **couple's journey**.

Built for the Future Health Digital Innovation Challenge (Abu Dhabi — DoH / ADPHC / Inception / MBZUAI).

## Architecture

Monorepo:

- **Next.js (App Router) + TypeScript + Tailwind** — frontend (patient + clinician) and backend (API routes).
- **Python ML service (`ml/`)** — scikit-learn predictive model served via FastAPI.
- **Prisma + SQLite** — persistence (migratable to Postgres).
- **FHIR-compatible** patient/observation resources.

> **Data policy:** No mocked or synthetic data. The database starts empty. The ML
> pipeline must be trained on a real, anonymized public dataset (e.g. HFEA or a Kaggle
> fertility dataset) placed at `ml/data/`.

## Getting started

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```

ML service:

```bash
cd ml
pip install -r requirements.txt
# place a real dataset at ml/data/fertility.csv, then:
python train.py
python serve.py
```

## Evaluation mapping

See [`docs/evaluation-mapping.md`](docs/evaluation-mapping.md) for how the project maps to the
6 judging criteria (Health Impact, Technical Depth, Working Demo, Responsible AI, Scalability,
Commercial Viability).
