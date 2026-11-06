"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Wordmark, ArrowIcon, PatientIcon, ClinicianIcon } from "@/components/ui/Icons";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface LandingViewProps {
  initialHasSession: boolean;
  initialEmail: string;
  initialRole: string;
}

export function LandingView({ initialHasSession, initialEmail, initialRole }: LandingViewProps) {
  const router = useRouter();
  const [activeSession, setActiveSession] = useState(initialHasSession);

  const initials = initialRole === "CLINICIAN" ? "DR" : "PA";
  const dashboardHref = initialRole === "CLINICIAN" ? "/clinician/dashboard" : "/patient/dashboard";

  async function handleLogout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    setActiveSession(false);
    router.refresh();
  }

  return (
    <div className="landing-page">
      <div className="ambient-glow" aria-hidden="true" />
      <header className="landing-header">
        <Wordmark href="/" />
        <div className="prototype-control">
          <span>Prototype</span>
          <button
            type="button"
            className={`session-toggle ${activeSession ? "is-active" : ""}`}
            onClick={() => setActiveSession(!activeSession)}
            aria-pressed={activeSession}
            aria-label="Toggle active session"
          >
            <span className="toggle-knob" />
          </button>
          <span className="prototype-state">
            {activeSession ? "Active session" : "Signed out"}
          </span>
        </div>
      </header>

      <main className="hero">
        <div className="hero-content">
          <div className="trust-mark" aria-hidden="true">
            <span className="trust-orbit orbit-one" />
            <span className="trust-orbit orbit-two" />
            <span className="trust-core" />
          </div>
          <h1>ReproAI</h1>
          <p className="hero-subtitle">
            Personalized fertility success prediction and infertility
            management, treating infertility as a couple&apos;s journey
          </p>

          {activeSession ? (
            <Card className="session-card">
              <Badge>Active Session</Badge>
              <div className="session-identity">
                <span className="avatar" aria-hidden="true">
                  {initials}
                </span>
                <div>
                  <strong>{initialEmail}</strong>
                  <span>Role: {initialRole.toUpperCase()}</span>
                </div>
              </div>
              <Button
                className="full-button"
                onClick={() => router.push(dashboardHref)}
              >
                Continue to Dashboard
                <ArrowIcon />
              </Button>
              <Button
                variant="ghost"
                className="full-button"
                onClick={handleLogout}
              >
                Log out / Switch account
              </Button>
            </Card>
          ) : (
            <div className="hero-actions-wrap">
              <div className="hero-actions">
                <Button onClick={() => router.push("/login?role=Patient")}>
                  <PatientIcon />
                  Sign in as Patient
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => router.push("/login?role=Clinician")}
                >
                  <ClinicianIcon />
                  Sign in as Clinician
                </Button>
              </div>
              <p className="register-prompt">
                New to ReproAI?{" "}
                <button
                  className="text-link"
                  onClick={() => router.push("/register")}
                >
                  Create an account
                </button>
              </p>
            </div>
          )}
        </div>
      </main>

      <footer className="landing-footer">
        <span>Private by design</span>
        <span className="footer-dot" />
        <span>Built for couples and care teams</span>
      </footer>
    </div>
  );
}

