"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon, IconName, Wordmark } from "@/components/ui/Icons";

export default function Onboarding() {
  const router = useRouter();
  const [femaleName, setFemaleName] = useState("");
  const [maleName, setMaleName] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const rows: [IconName, string, string][] = [
    [
      "lock",
      "Encrypted by default",
      "Your health data is protected in transit and at rest."
    ],
    [
      "refresh",
      "You stay in control",
      "Consent can be revoked at any time from My data."
    ],
    [
      "info",
      "Guidance, not a diagnosis",
      "AI guidance does not replace advice from your care team."
    ]
  ];

  async function handleContinue() {
    if (!consent) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          femaleName: femaleName.trim() || undefined,
          maleName: maleName.trim() || undefined
        })
      });
      if (!res.ok) throw new Error("Could not record onboarding information.");
      router.push("/patient/data-entry");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="onboarding-page">
      <header className="minimal-header">
        <Wordmark href="/" />
      </header>
      <main className="onboarding-main">
        <div className="onboarding-intro">
          <p className="eyebrow">Before we begin</p>
          <h1>Welcome to ReproAI</h1>
          <p>
            We believe informed choices start with clear, honest information.
          </p>
        </div>
        <Card className="consent-card">
          <div className="consent-icon">
            <Icon name="shield" size={28} />
          </div>
          <h2>Informed consent &amp; data governance</h2>
          <p className="consent-lead">
            Please review how we protect your information and support your decisions.
          </p>
          <div className="consent-rows">
            {rows.map(([icon, title, text]) => (
              <div className="consent-row" key={title}>
                <span>
                  <Icon name={icon} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, marginBottom: 8 }}>
            <div className="data-form-grid" style={{ marginTop: 8 }}>
              <Input
                label="Female partner name (optional)"
                type="text"
                placeholder="e.g. Maya A."
                value={femaleName}
                onChange={(e) => setFemaleName(e.target.value)}
              />
              <Input
                label="Male partner name (optional)"
                type="text"
                placeholder="e.g. Omar A."
                value={maleName}
                onChange={(e) => setMaleName(e.target.value)}
              />
            </div>
          </div>

          <label className="consent-check">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
            />
            <span>
              I give informed consent to the processing of my health data
            </span>
          </label>

          {error && <p className="form-error">{error}</p>}

          <Button
            className="full-button"
            disabled={!consent || submitting}
            onClick={handleContinue}
          >
            {submitting ? "Saving…" : "Continue"} <Icon name="arrow" />
          </Button>
        </Card>
      </main>
    </div>
  );
}
