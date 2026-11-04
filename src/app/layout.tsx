import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ReproAI",
  description: "Personalized fertility success prediction and infertility management"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
