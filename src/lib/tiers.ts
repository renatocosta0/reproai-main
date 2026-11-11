// Plain-language wording for the ML service's risk tiers. Deliberately calm:
// the challenge brief asks us to avoid anxiety and false certainty.

export interface TierCopy {
  label: string;
  tone: "good" | "neutral" | "attention";
  summary: string;
}

const TIERS: Record<string, TierCopy> = {
  OPTIMAL: {
    label: "Favourable",
    tone: "good",
    summary: "Your current markers sit in a favourable range for your age."
  },
  AGE_APPROPRIATE: {
    label: "As expected for age",
    tone: "neutral",
    summary: "Your markers are in line with what is typical for your age."
  },
  REDUCED_RESERVE: {
    label: "Worth discussing",
    tone: "attention",
    summary: "Some markers are below the typical range. Your clinician can explain what this means for your plans."
  },
  MILD_OLIGOZOOSPERMIA: {
    label: "Worth discussing",
    tone: "attention",
    summary: "Sperm concentration is slightly below the WHO reference range. This is common and often improves."
  },
  CLINICAL_ATTENTION_NEEDED: {
    label: "Review with your clinician",
    tone: "attention",
    summary: "Your clinician should review these results with you to plan next steps."
  },
  COUPLE_BIVARIATE: {
    label: "Joint estimate",
    tone: "neutral",
    summary: "A combined estimate using both partners' clinical factors."
  }
};

export function tierCopy(tier: string | null | undefined): TierCopy {
  return (tier && TIERS[tier]) || { label: "Estimate", tone: "neutral", summary: "" };
}

/** Probability arrives as a percentage (0-100). */
export function pct(n: number | null | undefined, digits = 0): string {
  return n === null || n === undefined || Number.isNaN(n) ? "–" : `${n.toFixed(digits)}%`;
}

/** Readable names for the ML service's feature labels. */
export function featureLabel(feature: string): string {
  const map: Record<string, string> = {
    "Female age": "Age",
    "Male age": "Age",
    "AMH (ovarian reserve)": "Ovarian reserve (AMH)",
    "Sperm concentration": "Sperm concentration",
    BMI: "Body mass index",
    "PCOS history": "PCOS history",
    "Infertility duration": "Time trying to conceive",
    "Prior treatment cycles": "Previous treatment cycles"
  };
  return map[feature] ?? feature;
}

export const WHO_SPERM_LOWER_LIMIT = 15; // million/mL, WHO 6th ed. (2021)
