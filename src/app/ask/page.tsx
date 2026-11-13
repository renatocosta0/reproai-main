import type { Metadata } from "next";
import { LocaleProvider } from "@/components/i18n/LocaleContext";
import { PublicAsk } from "@/components/public/PublicAsk";
import "./ask.css";

export const metadata: Metadata = {
  title: "Ask about reproductive health · ReproAI",
  description: "General, cited guidance on reproductive health. No account, nothing saved."
};

// Public, guidance-only assistant (no sign-in). See src/components/public/PublicAsk.tsx.
export default function AskPage() {
  return (
    <LocaleProvider>
      <PublicAsk />
    </LocaleProvider>
  );
}
