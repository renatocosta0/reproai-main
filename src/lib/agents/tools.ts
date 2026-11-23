// Built-in agent tools. Each handler performs real work against the project's
// own services (the ML prediction API and Azure AI Search grounding). No tool
// returns fabricated data; when a backing service is unavailable the handler
// surfaces an honest error object.

import { Tool } from "@/lib/agents/types";
import { predict } from "@/lib/ml-client";
import { retrieve } from "@/lib/rag/retrieve";
import { citationLabel } from "@/lib/rag/corpus";

const predictFertility: Tool = {
  name: "predict_fertility_success",
  description:
    "Estimate the probability of fertility treatment success from clinical inputs using the ReproAI model.",
  parameters: {
    type: "object",
    properties: {
      age: { type: "number", description: "Female age in years" },
      bmi: { type: "number" },
      sperm_count: { type: "number", description: "Sperm concentration (million/mL)" },
      amh: { type: "number", description: "Anti-Mullerian hormone (ng/mL)" },
      pcos_history: { type: "boolean" },
      infertility_duration_months: { type: "number" },
      prior_cycles: { type: "number" }
    },
    required: [
      "age",
      "bmi",
      "sperm_count",
      "amh",
      "pcos_history",
      "infertility_duration_months",
      "prior_cycles"
    ]
  },
  handler: async (args) => {
    return predict({
      age: Number(args.age),
      bmi: Number(args.bmi),
      sperm_count: Number(args.sperm_count),
      amh: Number(args.amh),
      pcos_history: Boolean(args.pcos_history),
      infertility_duration_months: Number(args.infertility_duration_months),
      prior_cycles: Number(args.prior_cycles)
    });
  }
};

const searchGuidelines: Tool = {
  name: "search_guidelines",
  description:
    "Search the cited external clinical guidance library (Thiqa ART coverage document, WHO infertility guidance summaries, and other approved external sources). ReproAI internal product rules are excluded. Returns passages with IDs and citations, or abstained=true when nothing relevant exists.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "What to look up in the guidelines" }
    },
    required: ["query"]
  },
  handler: async (args) => {
    const r = await retrieve(String(args.query), { audience: "clinician", scope: "clinical" });
    return {
      abstained: r.abstain,
      reason: r.reason,
      passages: r.hits.map((h) => ({ id: h.passage.id, title: h.passage.title, citation: citationLabel(h.passage), status: h.passage.status, text: h.passage.text }))
    };
  }
};

export const builtinTools: Tool[] = [predictFertility, searchGuidelines];

