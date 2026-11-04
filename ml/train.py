"""Train the ReproAI fertility success model on a REAL dataset.

No synthetic or mocked data is generated. Place an anonymized public dataset
(e.g. HFEA or a Kaggle fertility dataset) at ml/data/fertility.csv with the
expected columns before running this script.

Expected columns:
    age, bmi, sperm_count, amh, pcos_history, infertility_duration_months,
    prior_cycles, success (target: 0/1)
"""
import os
import json
import joblib
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import roc_auc_score, classification_report

MODEL_VERSION = "0.1.0"
DATA_PATH = os.path.join(os.path.dirname(__file__), "data", "fertility.csv")
MODEL_PATH = os.path.join(os.path.dirname(__file__), "models", "model.joblib")

FEATURES = [
    "age",
    "bmi",
    "sperm_count",
    "amh",
    "pcos_history",
    "infertility_duration_months",
    "prior_cycles",
]
TARGET = "success"


def main() -> None:
    if not os.path.exists(DATA_PATH):
        raise FileNotFoundError(
            f"No dataset found at {DATA_PATH}. Provide a REAL anonymized dataset; "
            "this project does not generate synthetic data."
        )

    df = pd.read_csv(DATA_PATH)
    missing = [c for c in FEATURES + [TARGET] if c not in df.columns]
    if missing:
        raise ValueError(f"Dataset missing required columns: {missing}")

    X = df[FEATURES].astype(float)
    y = df[TARGET].astype(int)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    model = GradientBoostingClassifier(random_state=42)
    model.fit(X_train, y_train)

    proba = model.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, proba)
    print(f"AUC: {auc:.3f}")
    print(classification_report(y_test, model.predict(X_test)))

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump({"model": model, "features": FEATURES, "version": MODEL_VERSION}, MODEL_PATH)
    print(f"Saved model to {MODEL_PATH}")
    print(json.dumps({"auc": auc, "version": MODEL_VERSION}))


if __name__ == "__main__":
    main()
