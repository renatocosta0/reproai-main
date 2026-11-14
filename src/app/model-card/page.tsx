import type { Metadata } from "next";
import { LocaleProvider } from "@/components/i18n/LocaleContext";
import { ModelCardView } from "@/components/public/ModelCardView";
import { getModelInfo, type ModelInfo } from "@/lib/ml-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Model card · ReproAI",
  description: "What the ReproAI scoring model is, what it is for, how it explains itself and its limitations."
};

// Public model card. Every fact comes live from the ML service (GET /model-info),
// in English and Arabic, so the card always matches the model version actually
// running. If the service is unreachable the page says so instead of showing stale text.
export default async function ModelCardPage() {
  let info: ModelInfo | null = null;
  try {
    info = await getModelInfo();
  } catch {
    info = null;
  }
  return (
    <LocaleProvider>
      <ModelCardView info={info} />
    </LocaleProvider>
  );
}
