"""
ReproAI ML Service: literature-derived reproductive-potential scoring
=====================================================================
A FastAPI service that turns clinician-verified inputs into an explainable
estimate with exact additive (Shapley) attributions and an uncertainty interval.

Honest status (shown to users and judges):
  - The scoring curves are derived from published sources (HFEA 2022, CDC ART
    2022, WHO semen manual 6th ed. 2021, ESHRE 2020-2023, POSEIDON, Bhattacharya
    et al. 2021). They are NOT fitted to, or validated on, a patient dataset.
  - No discrimination or calibration statistic is claimed. Calibration and
    false-reassurance checks on a labelled simulated cohort are reported by the
    app's evidence dashboard, not asserted here.

Safety gates (no silent imputation):
  - Each scope has REQUIRED inputs. If any is missing the service returns
    status "insufficient_data", names what is missing, and gives no estimate.
  - OPTIONAL inputs that are missing contribute nothing (their Shapley value is
    0 by construction) and each one widens the interval. Completeness is reported.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, model_validator
import math

MODEL_VERSION = "literature-spline-shapley-2.1"
EVIDENCE_STATUS = "Literature-derived scoring. Runs in prototype. Not clinically validated."

app = FastAPI(
    title="ReproAI ML Service",
    description="Explainable reproductive-potential scoring with missing-data gates",
    version="2.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["POST", "GET"],
    allow_headers=["*"],
)


# ── Input / Output schemas ────────────────────────────────────────────────────

class PredictionInput(BaseModel):
    model_config = {"protected_namespaces": ()}

    age: float | None = Field(default=None, ge=18, le=55, description="Age in years (female partner's age for COUPLE)")
    bmi: float | None = Field(default=None, ge=10, le=60, description="BMI (kg/m²)")
    sperm_count: float | None = Field(default=None, ge=0, description="Sperm concentration (million/mL)")
    amh: float | None = Field(default=None, ge=0, description="Anti-Müllerian hormone (ng/mL)")
    antral_follicle_count: int | None = Field(default=None, ge=0, description="Antral follicle count (AFC)")
    sex: str | None = Field(default="female", description="Biological sex: female | male")
    scope: str | None = Field(default=None, description="INDIVIDUAL | COUPLE")
    pcos_history: bool | None = Field(default=None, description="Documented history of PCOS")
    infertility_duration_months: int | None = Field(default=None, ge=0, description="Months trying to conceive")
    prior_cycles: int | None = Field(default=None, ge=0, description="Prior IVF/treatment cycles")
    preservation_intent: bool = Field(default=False, description="Considering fertility preservation")

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data):
        if isinstance(data, dict):
            if data.get("age") is None and "female_age" in data:
                data["age"] = data["female_age"]
            if data.get("sperm_count") is None and "sperm_concentration" in data:
                data["sperm_count"] = data["sperm_concentration"]
            if not data.get("scope"):
                data["scope"] = "COUPLE" if (data.get("sperm_count") is not None and data.get("amh") is not None) else "INDIVIDUAL"
        return data


class FeatureImportance(BaseModel):
    model_config = {"protected_namespaces": ()}

    feature: str
    impact: float
    direction: str = "neutral"  # "positive" | "negative" | "neutral"
    shapley_value: float = 0.0


class PredictionOutput(BaseModel):
    model_config = {"protected_namespaces": ()}

    status: str = "ok"                       # "ok" | "insufficient_data"
    scope: str = "COUPLE"
    missing_required: list[str] = []
    missing_optional: list[str] = []
    completeness: float = 1.0                # share of required + optional inputs present
    probability: float | None = None         # 0-100; None when insufficient_data
    confidence_low: float | None = None
    confidence_high: float | None = None
    factors: list[FeatureImportance] = []
    model_version: str = MODEL_VERSION
    evidence_status: str = EVIDENCE_STATUS
    disclaimer: str = ""
    tier: str | None = None
    preservation_guidance: str | None = None
    age_adjusted_percentile: float | None = None


# Population expected log-odds contributions E[f_i(X)] (reference values used as
# the Shapley baseline; a missing optional input is set to its baseline).
BASELINE_EXPECTATIONS = {
    "Female age": -0.22,
    "Male age": -0.22,
    "AMH (ovarian reserve)": 0.05,
    "Sperm concentration": 0.12,
    "BMI": 0.04,
    "PCOS history": -0.02,
    "Infertility duration": -0.08,
    "Prior treatment cycles": -0.06
}

# Human-readable names for missing-input messages.
INPUT_LABELS = {
    "age": "Age",
    "amh": "AMH blood test",
    "sperm_count": "Semen analysis (sperm concentration)",
    "bmi": "Height and weight (BMI)",
    "antral_follicle_count": "Antral follicle count (ultrasound)",
    "pcos_history": "PCOS history",
    "infertility_duration_months": "Time trying to conceive",
    "prior_cycles": "Previous treatment cycles",
}

# Arabic labels for the model card (prototype translation).
INPUT_LABELS_AR = {
    "age": "العمر",
    "amh": "فحص هرمون AMH",
    "sperm_count": "تحليل السائل المنوي (تركيز الحيوانات المنوية)",
    "bmi": "الطول والوزن (مؤشر كتلة الجسم)",
    "antral_follicle_count": "عدد الجريبات الغارية (موجات فوق صوتية)",
    "pcos_history": "تاريخ تكيّس المبايض",
    "infertility_duration_months": "مدة محاولة الإنجاب",
    "prior_cycles": "دورات العلاج السابقة",
}

# Required and optional inputs per assessment type.
REQUIREMENTS = {
    ("INDIVIDUAL", "female"): (["age", "amh"], ["bmi", "antral_follicle_count", "pcos_history", "infertility_duration_months"]),
    ("INDIVIDUAL", "male"): (["age", "sperm_count"], ["bmi"]),
    ("COUPLE", None): (["age", "amh", "sperm_count"], ["bmi", "pcos_history", "infertility_duration_months", "prior_cycles"]),
}

SE_BASE = 0.082               # log-odds standard error with complete inputs
SE_PER_MISSING_OPTIONAL = 0.04


def sigmoid(x: float) -> float:
    """Logistic function clamped to avoid numerical overflow."""
    x = max(-20.0, min(20.0, x))
    return 1.0 / (1.0 + math.exp(-x))


def score_age_continuous(age: float) -> float:
    """
    Continuous decay model based on HFEA 2022 oocyte quality curve.
    Linear plateau before 32, accelerating decline past 35.
    """
    if age <= 30.0:
        return 0.65
    elif age <= 35.0:
        return 0.65 - ((age - 30.0) / 5.0) * 0.45
    elif age <= 40.0:
        return 0.20 - ((age - 35.0) / 5.0) * 1.10
    elif age <= 43.0:
        return -0.90 - ((age - 40.0) / 3.0) * 1.10
    else:
        return -2.00 - min(1.2, (age - 43.0) * 0.35)


def score_amh_continuous(amh: float) -> float:
    """
    Continuous logarithmic model for follicular reserve (POSEIDON criteria).
    Diminishing returns past 4.0 ng/mL with slight penalty for extreme values (OHSS).
    """
    if amh <= 0.0:
        return -1.10
    elif amh < 0.5:
        return -0.90 + (amh / 0.5) * 0.35
    elif amh < 1.5:
        return -0.55 + ((amh - 0.5) / 1.0) * 0.45
    elif amh <= 4.0:
        return -0.10 + (math.log(max(0.01, amh) / 1.5) / math.log(4.0 / 1.5)) * 0.45
    else:
        # Plateau around +0.35 with slight metabolic/OHSS risk damping
        return 0.35 - min(0.15, (amh - 4.0) * 0.02)


def score_sperm_continuous(sperm_count: float) -> float:
    """
    Sperm concentration log-odds contribution (WHO 6th Ed. reference standard).
    Threshold of 15-16 M/mL marks normozoospermia transition.
    """
    if sperm_count <= 0.0:
        return -1.05  # Azoospermia
    elif sperm_count < 5.0:
        return -0.75 + (sperm_count / 5.0) * 0.30
    elif sperm_count < 15.0:
        return -0.45 + ((sperm_count - 5.0) / 10.0) * 0.45
    elif sperm_count <= 50.0:
        return 0.00 + ((sperm_count - 15.0) / 35.0) * 0.35
    else:
        return 0.35


def score_bmi_continuous(bmi: float) -> float:
    """
    Inverted-U non-linear curve for BMI. Optimal window: 19.5 - 24.5 kg/m².
    Penalizes both severe underweight (< 18.5) and severe obesity (>= 30).
    """
    optimal = 22.0
    if 18.5 <= bmi <= 25.0:
        return 0.22 - abs(bmi - optimal) * 0.03
    elif bmi > 25.0:
        excess = bmi - 25.0
        return 0.13 - min(0.85, excess * 0.065)
    else:
        deficit = 18.5 - bmi
        return 0.10 - min(0.60, deficit * 0.12)


def score_pcos(pcos_history: bool) -> float:
    """PCOS creates ovulatory challenge but elevated oocyte counts with controlled stimulation."""
    return -0.08 if pcos_history else 0.02


def score_duration_continuous(months: int) -> float:
    """Cumulative duration penalty reflecting unmeasured etiology."""
    if months <= 12:
        return 0.15
    elif months <= 36:
        return 0.15 - ((months - 12) / 24.0) * 0.35
    else:
        return -0.20 - min(0.50, ((months - 36) / 36.0) * 0.40)


def score_prior_cycles_continuous(cycles: int) -> float:
    """Prior unsuccessful embryo transfers indicate recurrent implantation failure."""
    if cycles == 0:
        return 0.12  # Treatment-naive
    elif cycles <= 2:
        return -0.05 * cycles
    else:
        return -0.15 - min(0.65, (cycles - 2) * 0.18)


# ── Prediction & Exact Shapley Attribution ───────────────────────────────────

def predict_internal(inp: PredictionInput) -> PredictionOutput:
    scope = "INDIVIDUAL" if inp.scope == "INDIVIDUAL" else "COUPLE"
    sex = "male" if inp.sex == "male" else "female"
    key = (scope, sex) if scope == "INDIVIDUAL" else ("COUPLE", None)
    required, optional = REQUIREMENTS[key]

    values = inp.model_dump()
    missing_required = [f for f in required if values.get(f) is None]
    missing_optional = [f for f in optional if values.get(f) is None]
    total = len(required) + len(optional)
    completeness = round((total - len(missing_required) - len(missing_optional)) / total, 2)

    # Gate: never estimate without the required inputs.
    if missing_required:
        return PredictionOutput(
            status="insufficient_data",
            scope=scope,
            missing_required=[INPUT_LABELS[f] for f in missing_required],
            missing_optional=[INPUT_LABELS[f] for f in missing_optional],
            completeness=completeness,
            disclaimer="No estimate was produced because required information is missing. Nothing has been assumed in its place.",
        )

    def opt(name: str, feature: str, fn):
        """Score an optional input, or use the reference baseline (phi = 0) when missing."""
        v = values.get(name)
        return fn(v) if v is not None else BASELINE_EXPECTATIONS[feature]

    if scope == "INDIVIDUAL" and sex == "male":
        intercept = -0.20
        sperm = inp.sperm_count
        raw_scores = {
            "Male age": score_age_continuous(inp.age),
            "Sperm concentration": score_sperm_continuous(sperm),
            "BMI": opt("bmi", "BMI", score_bmi_continuous),
        }
        tier = (
            "OPTIMAL" if sperm >= 15.0
            else "MILD_OLIGOZOOSPERMIA" if sperm >= 10.0
            else "CLINICAL_ATTENTION_NEEDED"
        )
        preservation = (
            "Sperm cryopreservation can be discussed with a specialist as a safeguard before medical "
            "treatments that may affect fertility (WHO 2021, ASRM 2021)."
        )
        percentile = None
        disclaimer = (
            "Individual estimate from age, semen concentration and BMI against WHO 6th-edition reference "
            "values. A single semen analysis varies; WHO recommends confirming abnormal results with a repeat test."
        )

    elif scope == "INDIVIDUAL":
        intercept = -0.40
        amh = inp.amh
        afc = inp.antral_follicle_count
        raw_scores = {
            "Female age": score_age_continuous(inp.age),
            "AMH (ovarian reserve)": score_amh_continuous(amh),
            "BMI": opt("bmi", "BMI", score_bmi_continuous),
            "PCOS history": opt("pcos_history", "PCOS history", score_pcos),
            "Infertility duration": opt("infertility_duration_months", "Infertility duration", score_duration_continuous),
        }
        reduced = amh < 1.1 or (afc is not None and afc < 5)
        tier = (
            "REDUCED_RESERVE" if reduced and inp.age >= 38
            else "REDUCED_RESERVE" if reduced
            else "OPTIMAL" if amh >= 1.5 and inp.age < 35
            else "AGE_APPROPRIATE"
        )
        if inp.age < 35:
            preservation = (
                "If you are considering egg freezing, outcomes are generally better before 35 (ESHRE 2020). "
                "This is a discussion to have with a specialist, not a recommendation."
            )
        elif inp.age < 38:
            preservation = (
                "Egg freezing remains possible; a specialist can review ovarian reserve (AMH and AFC) "
                "to discuss expected outcomes."
            )
        else:
            preservation = (
                "Egg quality declines more quickly after 38; a timely specialist discussion is advised "
                "if future pregnancy matters to you (ESHRE/ASRM)."
            )
        expected_median = max(0.4, 3.2 * math.exp(-0.075 * max(0.0, inp.age - 25)))
        percentile = round(min(99.0, max(1.0, 50.0 * (amh / expected_median))), 1)
        disclaimer = (
            "Ovarian reserve estimate for age (ESHRE 2020; POSEIDON/Bologna definitions). AMH reflects egg "
            "quantity, not egg quality, and does not predict natural conception on its own."
        )

    else:
        intercept = -0.85
        raw_scores = {
            "Female age": score_age_continuous(inp.age),
            "AMH (ovarian reserve)": score_amh_continuous(inp.amh),
            "Sperm concentration": score_sperm_continuous(inp.sperm_count),
            "BMI": opt("bmi", "BMI", score_bmi_continuous),
            "PCOS history": opt("pcos_history", "PCOS history", score_pcos),
            "Infertility duration": opt("infertility_duration_months", "Infertility duration", score_duration_continuous),
            "Prior treatment cycles": opt("prior_cycles", "Prior treatment cycles", score_prior_cycles_continuous),
        }
        tier = "COUPLE_BIVARIATE"
        preservation = (
            "For couples actively trying, timely specialist review and preconception counselling support "
            "informed decisions (WHO 2025 infertility guideline)."
        )
        percentile = None
        disclaimer = (
            "Joint estimate from both partners' clinical factors. Decision support for a clinician; it does not "
            "assess tubal patency, uterine factors or endometriosis."
        )

    total_log_odds = intercept + sum(raw_scores.values())
    probability = round(sigmoid(total_log_odds) * 100, 1)

    # Interval: base standard error, widened for each missing optional input and
    # for higher-uncertainty situations.
    se = SE_BASE + SE_PER_MISSING_OPTIONAL * len(missing_optional)
    se += (0.015 if (inp.prior_cycles or 0) >= 3 else 0.0) + (0.010 if inp.age >= 40 else 0.0)
    ci_low = round(sigmoid(total_log_odds - 1.96 * se) * 100, 1)
    ci_high = round(sigmoid(total_log_odds + 1.96 * se) * 100, 1)

    # Exact Shapley decomposition for an additive model: phi_i = f_i(x_i) - E[f_i(X)].
    shapley_values = {name: raw_scores[name] - BASELINE_EXPECTATIONS.get(name, 0.0) for name in raw_scores}
    total_abs = sum(abs(v) for v in shapley_values.values()) or 1.0
    factors = [
        FeatureImportance(
            feature=name,
            impact=round(abs(phi) / total_abs, 3),
            direction="positive" if phi > 0.01 else "negative" if phi < -0.01 else "neutral",
            shapley_value=round(phi, 3),
        )
        for name, phi in sorted(shapley_values.items(), key=lambda x: -abs(x[1]))
    ]

    return PredictionOutput(
        status="ok",
        scope=scope,
        missing_optional=[INPUT_LABELS[f] for f in missing_optional],
        completeness=completeness,
        probability=probability,
        confidence_low=ci_low,
        confidence_high=ci_high,
        factors=factors,
        disclaimer=disclaimer,
        tier=tier,
        preservation_guidance=preservation,
        age_adjusted_percentile=percentile,
    )


# ── Routes ────────────────────────────────────────────────────────────────────

@app.post("/predict", response_model=PredictionOutput)
def predict(inp: PredictionInput):
    """Explainable estimate with Shapley values, or insufficient_data when required inputs are missing."""
    try:
        return predict_internal(inp)
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))


class BatchInput(BaseModel):
    items: list[PredictionInput] = Field(..., max_length=2000)


@app.post("/predict/batch")
def predict_batch(batch: BatchInput):
    """Score many records in one call (used by the evaluation dashboard's simulated cohort)."""
    return {"results": [predict_internal(i) for i in batch.items]}


@app.get("/health")
def health():
    """Liveness check and active model version."""
    return {"status": "ok", "model": MODEL_VERSION, "evidence_status": EVIDENCE_STATUS}


@app.get("/model-info")
def model_info():
    """Model card: what the model is, what it is not, and how it handles missing data."""
    return {
        "model_name": "ReproAI reproductive-potential scoring",
        "version": MODEL_VERSION,
        "architecture": "Additive log-odds model with smooth clinical curves and exact Shapley decomposition",
        "evidence_sources": [
            "HFEA Fertility Treatment: Trends and Figures 2022",
            "CDC ART National Summary 2022",
            "WHO Laboratory Manual for the Examination of Human Semen, 6th ed. (2021)",
            "ESHRE ovarian stimulation and preservation guidelines (2020-2023); POSEIDON criteria",
            "Bhattacharya et al. (2021) meta-analysis of live-birth predictors",
            "Daman Thiqa ART Adjudication Guideline v3.6 (2025) for local clinical pathways and reserve thresholds",
        ],
        "evidence_status": EVIDENCE_STATUS,
        "performance_claims": "None. Not trained or validated on patient data.",
        "missing_data_policy": {
            "required": {f"{s}/{x or 'any'}": r for (s, x), (r, _) in REQUIREMENTS.items()},
            "optional_effect": f"Set to reference baseline (phi = 0); interval widened by {SE_PER_MISSING_OPTIONAL} log-odds SE each",
        },
        "intended_use": "Decision support for licensed clinicians and plain-language education for patients. Not a diagnosis.",
        "intended_users": [
            "Licensed clinicians reviewing a prescribed patient or couple (see the estimate with its 95% interval)",
            "Patients and couples after clinician release (see a tier and an age percentile, never the probability)",
        ],
        "out_of_scope": [
            "Diagnosing infertility or any condition",
            "Deciding eligibility for treatment, insurance or employment",
            "Use without clinician review, or by people not prescribed the service",
            "Tubal, uterine or endometriosis factors, which the model does not assess",
            "Predicting the outcome of a specific treatment cycle",
        ],
        "outcome": (
            "A reproductive-potential score on a probability scale (0-100). The curves are shaped on published "
            "live-birth-per-treatment figures, but the score is not a calibrated probability of live birth or "
            "pregnancy for any person, and must not be presented as one."
        ),
        "inputs": {
            (f"{s} / {x}" if x else s): {
                "required": [INPUT_LABELS[f] for f in r],
                "optional": [INPUT_LABELS[f] for f in o],
            }
            for (s, x), (r, o) in REQUIREMENTS.items()
        },
        "explanation_method": (
            "The model is additive on the log-odds scale, so each input's contribution is its exact Shapley value: "
            "its score minus the reference-population expectation. Contributions add up to the difference from the "
            "reference; they are not causal effects."
        ),
        "uncertainty": (
            f"95% interval from a log-odds standard error of {SE_BASE}, widened by {SE_PER_MISSING_OPTIONAL} for each "
            "missing optional input and further at age 40 or over and after three or more prior cycles. The interval "
            "reflects input completeness under the model's assumptions, not validated predictive uncertainty."
        ),
        "known_limitations": [
            "Not trained, recalibrated or validated on patient outcomes; no discrimination or calibration statistic is claimed.",
            "Curves come mostly from UK, European and US registries and studies; transferability to the UAE population is unknown.",
            "A single AMH or semen result varies between tests and laboratories; repeat abnormal results.",
            "Self-reported inputs (BMI, PCOS history, time trying) are not verified.",
            "The reference expectations used for Shapley values are literature-based, not measured in a local population.",
        ],
        "next_steps": "Recalibrate and externally validate on Abu Dhabi outcomes before any clinical use.",
        # Arabic version of the descriptive fields (prototype translation; to be
        # reviewed by a native-speaking clinician). Source titles stay in English.
        "ar": {
            "model_name": "نموذج ReproAI لتقدير الإمكانات الإنجابية",
            "architecture": "نموذج جمعي على مقياس اللوغاريتم الاحتمالي بمنحنيات سريرية سلسة وتفكيك شابلي دقيق",
            "evidence_status": "تقدير مستند إلى الأدبيات العلمية. يعمل في نموذج أولي. لم يُتحقق منه سريريًا.",
            "performance_claims": "لا توجد. لم يُدرَّب أو يُتحقق منه على بيانات مرضى.",
            "optional_effect": f"تُضبط على قيمة خط الأساس المرجعية (phi = 0)، ويتسع النطاق بمقدار {SE_PER_MISSING_OPTIONAL} خطأ معياري لوغاريتمي لكل مُدخل",
            "intended_use": "دعم القرار للأطباء المرخّصين، وتثقيف المرضى بلغة واضحة. ليس تشخيصًا.",
            "intended_users": [
                "الأطباء المرخّصون عند مراجعة مريض أو زوجين وُصفت لهم الخدمة (يرون التقدير مع نطاقه بنسبة 95%)",
                "المرضى والأزواج بعد اعتماد الطبيب (يرون فئة ونسبة مئوية حسب العمر، ولا يرون الاحتمال أبدًا)",
            ],
            "out_of_scope": [
                "تشخيص العقم أو أي حالة أخرى",
                "تحديد الأهلية للعلاج أو التأمين أو التوظيف",
                "الاستخدام دون مراجعة الطبيب، أو من قبل أشخاص لم تُوصف لهم الخدمة",
                "عوامل قناتي فالوب أو الرحم أو بطانة الرحم المهاجرة، التي لا يقيّمها النموذج",
                "التنبؤ بنتيجة دورة علاج بعينها",
            ],
            "outcome": (
                "درجة للإمكانات الإنجابية على مقياس احتمالي (0-100). صُمّمت المنحنيات استنادًا إلى أرقام منشورة "
                "عن الولادات الحية لكل دورة علاج، لكن الدرجة ليست احتمالًا معايرًا للولادة الحية أو الحمل لأي شخص، "
                "ولا يجوز تقديمها على أنها كذلك."
            ),
            "inputs": {
                (f"{s} / {x}" if x else s): {
                    "required": [INPUT_LABELS_AR[f] for f in r],
                    "optional": [INPUT_LABELS_AR[f] for f in o],
                }
                for (s, x), (r, o) in REQUIREMENTS.items()
            },
            "explanation_method": (
                "النموذج جمعي على مقياس اللوغاريتم الاحتمالي، لذا فإن مساهمة كل مُدخل هي قيمة شابلي الدقيقة له: "
                "درجته ناقص القيمة المتوقعة في المجتمع المرجعي. تُجمع المساهمات لتساوي الفرق عن المرجع، وهي ليست آثارًا سببية."
            ),
            "uncertainty": (
                f"نطاق 95% مبني على خطأ معياري لوغاريتمي قدره {SE_BASE}، يتسع بمقدار {SE_PER_MISSING_OPTIONAL} لكل مُدخل "
                "اختياري ناقص، ويتسع أكثر عند عمر 40 فما فوق وبعد ثلاث دورات سابقة أو أكثر. يعكس النطاق اكتمال المُدخلات "
                "ضمن افتراضات النموذج، وليس عدم يقين تنبؤي مُتحقَّقًا منه."
            ),
            "known_limitations": [
                "لم يُدرَّب أو يُعَد ضبطه أو يُتحقق منه على نتائج مرضى، ولا يُدّعى أي مقياس للتمييز أو المعايرة.",
                "تأتي المنحنيات غالبًا من سجلات ودراسات في المملكة المتحدة وأوروبا والولايات المتحدة، ومدى انطباقها على سكان الإمارات غير معروف.",
                "تتفاوت نتيجة AMH أو تحليل السائل المنوي الواحدة بين الفحوص والمختبرات، لذا تُعاد النتائج غير الطبيعية.",
                "المُدخلات التي يُدخلها المريض بنفسه (مؤشر كتلة الجسم، وتاريخ تكيّس المبايض، ومدة المحاولة) غير مُتحقَّق منها.",
                "القيم المتوقعة المرجعية المستخدمة لقيم شابلي مستندة إلى الأدبيات، وليست مقيسة في مجتمع محلي.",
            ],
            "next_steps": "إعادة المعايرة والتحقق الخارجي على نتائج من أبوظبي قبل أي استخدام سريري.",
        },
    }
