# ReproAI ML Service

A local FastAPI service that provides IVF success probability estimates.
It acts as the backend for `POST /api/predict` in the Next.js app.

## Model

A clinically-grounded logistic regression with coefficients derived from
published IVF outcome research:

- **HFEA** Fertility Treatment Trends 2022
- **CDC ART** National Summary Report 2022
- **WHO** Laboratory Manual for Semen Analysis, 6th edition (2021)
- **ESHRE** Ovarian Reserve Testing Guidance (2023)
- **Bhattacharya et al. (2021)** meta-analysis of IVF outcome predictors

Each scoring coefficient has an inline clinical rationale in `main.py`.

## Setup & Run

```bash
cd ml-service

# Create a virtual environment (recommended)
python -m venv .venv
.venv\Scripts\activate        # Windows
# source .venv/bin/activate   # macOS/Linux

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

The service starts at **http://localhost:3000** (matches `ML_API_URL` in `.env`).

Verify it is running:
```bash
curl http://localhost:8000/health
# {"status":"ok","model":"clinical-scoring-v1.0"}
```

## Switching to Azure ML

When Azure ML / Azure AI Foundry credits are available:

1. Deploy the model to an Azure ML Online Endpoint or AI Foundry deployment.
2. Update `ML_API_URL` in `.env` to point to the Azure endpoint URL.
3. Stop the local `uvicorn` process — the Next.js app will call Azure instead.

No code changes are required in the Next.js application.

## API

### `POST /predict`

```json
{
  "age": 34,
  "bmi": 22.5,
  "sperm_count": 20,
  "amh": 2.1,
  "pcos_history": false,
  "infertility_duration_months": 18,
  "prior_cycles": 1
}
```

Response:
```json
{
  "probability": 38.4,
  "confidence_low": 33.1,
  "confidence_high": 44.0,
  "factors": [
    { "feature": "Female age", "impact": 0.312 },
    ...
  ],
  "model_version": "clinical-scoring-v1.0",
  "disclaimer": "..."
}
```

