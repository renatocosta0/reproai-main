import type { Metadata } from "next";
import { LocaleProvider } from "@/components/i18n/LocaleContext";
import { Coverage } from "@/components/public/Coverage";
import "./coverage.css";

export const metadata: Metadata = {
  title: "Demo coverage · ReproAI",
  description: "What runs in the ReproAI prototype, what is simulated and what is proposed, for each Challenge 02 requirement."
};

// Public demo-coverage page (English/Arabic). Content lives in src/components/public/Coverage.tsx.
export default function CoveragePage() {
  return (
    <LocaleProvider>
      <Coverage />
    </LocaleProvider>
  );
}
