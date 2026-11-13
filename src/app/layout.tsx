import type { Metadata } from "next";
import { DM_Sans, Manrope, Noto_Sans_Arabic } from "next/font/google";
import "./globals.css";
import "./reproai.css";
import "./landing.css";
import "./chat-history.css";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-dm-sans",
  display: "swap"
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-manrope",
  display: "swap"
});

const notoArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-arabic",
  display: "swap"
});

export const metadata: Metadata = {
  title: "ReproAI — Reproductive Potential & Life-Course Healthcare",
  description:
    "Evidence-informed longitudinal reproductive potential platform (Abu Dhabi Future Health Digital Innovation Challenge)."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: data-theme is set by the inline script before React hydrates.
    <html lang="en" className={`${dmSans.variable} ${manrope.variable} ${notoArabic.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
