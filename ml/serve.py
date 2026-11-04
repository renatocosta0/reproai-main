"""FastAPI service that serves fertility success predictions with explainability."""
import os
import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from schema import PredictionInput, PredictionOutput, FeatureImportance

MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "model.joblib")

app = FastAPI(title="ReproAI ML Service")
_bundle = None


def load_model():
    global _bundle
    if _bundle is None:
        if not os.path.exists(MODEL_PATH):
            raise HTTPException(
                status_code=503,
                detail="Model not trained yet. Train on a real dataset first (python train.py).",
            )
        _bundle = joblib.load(MODEL_PATH)
    return _bundle


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": os.path.exists(MODEL_PATH)}


@app.post("/predict", response_model=PredictionOutput)
def predict(payload: PredictionInput):
    bundle = load_model()
    model = bundle["model"]
    features = bundle["features"]

    row = {
        "age": payload.age,
        "bmi": payload.bmi,
        "sperm_count": payload.sperm_count,
        "amh": payload.amh,
        "pcos_history": int(payload.pcos_history),
        "infertility_duration_months": payload.infertility_duration_months,
        "prior_cycles": payload.prior_cycles,
    }
    X = pd.DataFrame([[row[f] for f in features]], columns=features)
    proba = float(model.predict_proba(X)[:, 1][0])

    importances = getattr(model, "feature_importances_", np.zeros(len(features)))
    factors = [
        FeatureImportance(feature=f, impact=float(i))
        for f, i in sorted(zip(features, importances), key=lambda t: t[1], reverse=True)
    ]

    return PredictionOutput(
        probability=round(proba * 100, 1),
        factors=factors,
        model_version=bundle.get("version", "unknown"),
    )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
