import type { Metadata } from "next";
import "./globals.css";
import "./reproai.css";
import "./landing.css";
import "./chat-history.css";
import "./cycle.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

export const metadata: Metadata = {
  title: "ReproAI — Reproductive Potential & Life-Course Healthcare",
  description:
    "Evidence-informed longitudinal reproductive potential platform (Abu Dhabi Future Health Digital Innovation Challenge)."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: data-theme is set by the inline script before React hydrates.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
