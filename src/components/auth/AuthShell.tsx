import type { ReactNode } from "react";
import { FileHeart, LineChart, ShieldCheck, Sparkles, UserRoundCheck } from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";

// Split-screen shell shared by the login and register pages. The story panel
// states what the product does; it contains no testimonials or user counts.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="login-page">
      <section className="login-story">
        <Link href="/" className="brand-home" aria-label="ReproAI home">
          <Logo />
        </Link>
        <div className="story-copy">
          <div className="eyebrow light">
            <Sparkles size={14} aria-hidden /> Fertility intelligence, made human
          </div>
          <h1>Better decisions for every step of the journey.</h1>
          <p>
            An evidence-led view of reproductive potential over time, for individuals and couples,
            prescribed and supported by your care team.
          </p>
          <div className="story-pillars">
            <div>
              <span>
                <LineChart size={16} aria-hidden />
              </span>
              <div>
                <strong>Change over time, not a single score</strong>
                <small>Probabilities with confidence intervals and plain-language factors</small>
              </div>
            </div>
            <div>
              <span>
                <UserRoundCheck size={16} aria-hidden />
              </span>
              <div>
                <strong>Individual first, couple ready</strong>
                <small>Pair with a partner when you choose, and revoke it at any time</small>
              </div>
            </div>
            <div>
              <span>
                <FileHeart size={16} aria-hidden />
              </span>
              <div>
                <strong>Connected to your clinic</strong>
                <small>FHIR R4 records designed for Malafi and Sahhatna exchange</small>
              </div>
            </div>
          </div>
        </div>
        <div className="story-footer">
          <ShieldCheck size={16} aria-hidden /> Grounded in WHO and ESHRE guidance
        </div>
      </section>

      <section className="login-panel">
        <div className="login-mobile-logo">
          <Link href="/" className="brand-home" aria-label="ReproAI home">
            <Logo />
          </Link>
        </div>
        {children}
        <div className="login-meta">Abu Dhabi Digital Health Innovation · Challenge 02</div>
      </section>
    </main>
  );
}
