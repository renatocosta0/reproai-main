// Lifestyle recommendations derived from WHO guidance on fertility and
// reproductive health. Recommendations are computed from the user's OWN entered
// data. If a value has not been entered, no recommendation is produced for it.

import { PatientClinicalData } from "@/types";

export interface Recommendation {
  topic: string;
  message: string;
  source: string;
}

export function buildRecommendations(data: PatientClinicalData): Recommendation[] {
  const recs: Recommendation[] = [];

  if (typeof data.bmi === "number") {
    if (data.bmi >= 30) {
      recs.push({
        topic: "Weight",
        message:
          "A BMI of 30 or higher can reduce fertility. Gradual weight reduction through a balanced diet and regular activity may improve outcomes.",
        source: "WHO reproductive health guidance"
      });
    } else if (data.bmi < 18.5) {
      recs.push({
        topic: "Weight",
        message:
          "A BMI below 18.5 can affect ovulation. A nutritionally adequate diet may help restore a healthy cycle.",
        source: "WHO reproductive health guidance"
      });
    }
  }

  if (data.pcosHistory === true) {
    recs.push({
      topic: "PCOS",
      message:
        "With a history of PCOS, consistent physical activity and a low-glycaemic diet are commonly advised. Discuss a tailored plan with your clinician.",
      source: "WHO / clinical PCOS guidance"
    });
  }

  return recs;
}
