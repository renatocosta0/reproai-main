import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReproAI — Reproductive Potential & Life-Course Healthcare",
  description: "Evidence-informed longitudinal reproductive potential platform (Abu Dhabi Future Health Digital Innovation Challenge)."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
