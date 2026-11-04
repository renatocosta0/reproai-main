"""Pydantic schemas for the ReproAI prediction service."""
from pydantic import BaseModel, Field
from typing import Optional, List


class PredictionInput(BaseModel):
    age: int = Field(..., ge=18, le=60, description="Female age in years")
    bmi: float = Field(..., ge=10, le=60)
    sperm_count: float = Field(..., ge=0, description="Sperm concentration (million/mL)")
    amh: float = Field(..., ge=0, description="Anti-Mullerian hormone (ng/mL)")
    pcos_history: bool
    infertility_duration_months: int = Field(..., ge=0)
    prior_cycles: int = Field(..., ge=0)


class FeatureImportance(BaseModel):
    feature: str
    impact: float


class PredictionOutput(BaseModel):
    probability: float
    confidence_low: Optional[float] = None
    confidence_high: Optional[float] = None
    factors: List[FeatureImportance]
    model_version: str
    disclaimer: str = (
        "This prediction is a decision-support estimate and does NOT replace a "
        "clinical diagnosis. Consult a fertility specialist."
    )
