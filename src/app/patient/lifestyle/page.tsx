"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon, IconName } from "@/components/ui/Icons";
import { buildRecommendations, Recommendation } from "@/lib/guidelines";

export default function LifestylePage() {
  const [bmi, setBmi] = useState("");
  const [pcos, setPcos] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  function compute(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!bmi || isNaN(Number(bmi))) {
      setError("Please enter your Body Mass Index (BMI).");
      return;
    }
    setError(null);
    const result = buildRecommendations({
      bmi: Number(bmi),
      pcosHistory: pcos
    });
    setRecs(result);
    setRevealed(true);
  }

  const itemsToDisplay = recs.map((r, i) => ({
    icon: (i === 0 ? "heart" : i === 1 ? "leaf" : "person") as IconName,
    title: r.topic,
    text: r.message,
    source: r.source
  }));

  return (
    <main className="page-main">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Patient workspace</p>
          <h1>Lifestyle</h1>
        </div>
      </div>

      <Card className="guidance-form-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Personalized support</p>
            <h2>Tell us about you</h2>
          </div>
          <span className="icon-tile">
            <Icon name="leaf" />
          </span>
        </div>
        <form className="guidance-form" onSubmit={compute}>
          <Input
            label="BMI"
            type="number"
            step="0.1"
            placeholder="e.g. 24.5"
            value={bmi}
            onChange={(e) => {
              setBmi(e.target.value);
              if (error) setError(null);
            }}
            required
          />
          <label className="check-field">
            <input
              type="checkbox"
              checked={pcos}
              onChange={(e) => setPcos(e.target.checked)}
            />
            <span>
              <strong>History of PCOS</strong>
              <small>Used only to tailor your guidance</small>
            </span>
          </label>

          {error && <p className="form-error" style={{ gridColumn: "1 / -1" }}>{error}</p>}

          <Button type="submit">Get guidance</Button>
        </form>
      </Card>

      {revealed && (
        itemsToDisplay.length > 0 ? (
          <div className="recommendation-grid">
            {itemsToDisplay.map((item) => (
              <Card className="recommendation-card" key={item.title}>
                <span className="recommendation-icon">
                  <Icon name={item.icon} size={21} />
                </span>
                <h2>{item.title}</h2>
                <p>{item.text}</p>
                <small>Source: {item.source}</small>
              </Card>
            ))}
          </div>
        ) : (
          <Card style={{ padding: "32px", textAlign: "center", marginTop: "24px" }}>
            <span style={{ color: "#0f766e", display: "inline-block", marginBottom: "8px" }}>
              <Icon name="check" size={24} />
            </span>
            <h3 style={{ fontSize: "16px", fontWeight: 650, color: "#0f172a" }}>Profile within standard target range</h3>
            <p style={{ color: "#64748b", fontSize: "13px", maxWidth: "480px", margin: "6px auto 0" }}>
              No specific clinical lifestyle interventions were triggered by the values entered. General WHO guidelines recommend balanced nutrition, 150 minutes of moderate activity weekly, and consistent sleep.
            </p>
          </Card>
        )
      )}
    </main>
  );
}
