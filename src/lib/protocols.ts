// Clinical protocol suggestions derived from a patient's real persisted data and
// their latest model prediction. Returns an empty list when inputs are missing;
// nothing is fabricated.

import { PatientClinicalData } from "@/types";

export interface ProtocolSuggestion {
  name: string;
  rationale: string;
}

export function suggestProtocols(
  data: PatientClinicalData,
  probability?: number
): ProtocolSuggestion[] {
  const out: ProtocolSuggestion[] = [];

  if (data.pcosHistory === true) {
    out.push({
      name: "Ovulation induction review",
      rationale:
        "History of PCOS is present; an ovulation induction protocol is commonly considered. Confirm with full clinical assessment."
    });
  }

  if (typeof data.spermCount === "number" && data.spermCount < 15) {
    out.push({
      name: "Male-factor workup / ICSI consideration",
      rationale:
        "Reported sperm concentration is below the typical reference range; a male-factor workup and ICSI may be relevant."
    });
  }

  if (typeof data.age === "number" && data.age >= 38) {
    out.push({
      name: "Ovarian reserve counselling",
      rationale:
        "Advanced maternal age; counselling on ovarian reserve and timing is advisable."
    });
  }

  if (typeof probability === "number" && probability < 25) {
    out.push({
      name: "Multidisciplinary case review",
      rationale:
        "Model-estimated success probability is low; a multidisciplinary review of alternatives is suggested before proceeding."
    });
  }

  return out;
}
