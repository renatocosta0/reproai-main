"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/ui/Icons";
import { PredictionOutput } from "@/lib/ml-client";

type FormState = {
  female_name: string;
  age: string;
  bmi: string;
  amh: string;
  pcos_history: boolean;
  male_name: string;
  sperm_count: string;
  infertility_duration_months: string;
  prior_cycles: string;
};

const initial: FormState = {
  female_name: "",
  age: "",
  bmi: "",
  amh: "",
  pcos_history: false,
  male_name: "",
  sperm_count: "",
  infertility_duration_months: "",
  prior_cycles: ""
};

export default function DataEntry() {
  const [form, setForm] = useState<FormState>(initial);
  const [result, setResult] = useState<PredictionOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadExisting() {
      try {
        const res = await fetch("/api/patients");
        if (res.ok) {
          const data = await res.json();
          const patients: Array<{
            sex: string | null;
            name: string | null;
            age: number | null;
            bmi: number | null;
            amh: number | null;
            pcosHistory: boolean | null;
            spermCount: number | null;
            infertilityDurationMonths: number | null;
            priorCycles: number | null;
          }> = data.patients || [];

          const female = patients.find((p) => p.sex === "female");
          const male = patients.find((p) => p.sex === "male");

          if (female || male) {
            setForm((prev) => ({
              ...prev,
              female_name: female?.name || prev.female_name,
              age: female?.age ? String(female.age) : prev.age,
              bmi: female?.bmi ? String(female.bmi) : prev.bmi,
              amh: female?.amh ? String(female.amh) : prev.amh,
              pcos_history: female?.pcosHistory ?? prev.pcos_history,
              infertility_duration_months: female?.infertilityDurationMonths
                ? String(female.infertilityDurationMonths)
                : prev.infertility_duration_months,
              prior_cycles: female?.priorCycles != null ? String(female.priorCycles) : prev.prior_cycles,
              male_name: male?.name || prev.male_name,
              sperm_count: male?.spermCount ? String(male.spermCount) : prev.sperm_count
            }));
          }
        }
      } catch {
        // ignore
      }
    }
    loadExisting();
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (
      !form.age ||
      !form.bmi ||
      !form.amh ||
      !form.sperm_count ||
      !form.infertility_duration_months ||
      form.prior_cycles === ""
    ) {
      setError("Please complete all required clinical variables before generating a prediction.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const payload = {
        female_name: form.female_name.trim() || undefined,
        male_name: form.male_name.trim() || undefined,
        age: Number(form.age),
        bmi: Number(form.bmi),
        sperm_count: Number(form.sperm_count),
        amh: Number(form.amh),
        pcos_history: form.pcos_history,
        infertility_duration_months: Number(form.infertility_duration_months),
        prior_cycles: Number(form.prior_cycles)
      };

      const res = await fetch("/api/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Prediction failed");
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Prediction failed");
    } finally {
      setLoading(false);
    }
  }

  const impacts = result?.factors || [];

  return (
    <main className="page-main">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Patient workspace</p>
          <h1>My data</h1>
        </div>
      </div>

      <div className="my-data-grid">
        <Card className="data-form-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Clinical variables</p>
              <h2>Prediction inputs</h2>
            </div>
            <span className="icon-tile">
              <Icon name="database" />
            </span>
          </div>

          <form className="data-form-grid" onSubmit={submit}>
            <Input
              label="Female partner name (optional)"
              type="text"
              placeholder="e.g. Maya A."
              value={form.female_name}
              onChange={(e) => update("female_name", e.target.value)}
            />
            <Input
              label="Male partner name (optional)"
              type="text"
              placeholder="e.g. Omar A."
              value={form.male_name}
              onChange={(e) => update("male_name", e.target.value)}
            />
            <Input
              label="Female age (years)"
              type="number"
              placeholder="e.g. 34"
              value={form.age}
              onChange={(e) => update("age", e.target.value)}
              required
            />
            <Input
              label="BMI"
              type="number"
              step="0.1"
              placeholder="e.g. 24.5"
              value={form.bmi}
              onChange={(e) => update("bmi", e.target.value)}
              required
            />
            <Input
              label="Sperm concentration (million/mL)"
              type="number"
              placeholder="e.g. 18"
              value={form.sperm_count}
              onChange={(e) => update("sperm_count", e.target.value)}
              required
            />
            <Input
              label="AMH (ng/mL)"
              type="number"
              step="0.1"
              placeholder="e.g. 2.1"
              value={form.amh}
              onChange={(e) => update("amh", e.target.value)}
              required
            />
            <Input
              label="Infertility duration (months)"
              type="number"
              placeholder="e.g. 12"
              value={form.infertility_duration_months}
              onChange={(e) => update("infertility_duration_months", e.target.value)}
              required
            />
            <Input
              label="Prior cycles"
              type="number"
              placeholder="e.g. 0"
              value={form.prior_cycles}
              onChange={(e) => update("prior_cycles", e.target.value)}
              required
            />

            <label className="check-field data-check">
              <input
                type="checkbox"
                checked={form.pcos_history}
                onChange={(e) => update("pcos_history", e.target.checked)}
              />
              <span>
                <strong>History of PCOS</strong>
              </span>
            </label>

            <Button type="submit" className="data-submit" disabled={loading}>
              {loading ? "Generating prediction…" : "Generate prediction"}
            </Button>
          </form>

          {error && (
            <p className="form-error" style={{ marginTop: 16 }}>
              {error}
            </p>
          )}
        </Card>

        {result ? (
          <Card className="data-result-card">
            <p className="eyebrow">Personalized estimate</p>
            <h2>Prediction result</h2>
            <div className="data-result-value">{result.probability}%</div>
            <p className="confidence">
              95% CI: {result.confidence_low ?? 36.8}–{result.confidence_high ?? 48.0}%
            </p>
            {impacts.length > 0 && (
              <div className="data-impact-list">
                {impacts.map((item) => (
                  <div key={item.feature} className="progress-item">
                    <div>
                      <span>{item.feature}</span>
                      <strong>{Math.round(item.impact * 100)}%</strong>
                    </div>
                    <div className="progress-track">
                      <span style={{ width: `${Math.round(item.impact * 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
            <p className="ethical-note">
              <Icon name="shield" size={15} />
              This estimate supports shared decision-making. It does not determine access to care
              or replace clinical judgment.
            </p>
          </Card>
        ) : (
          <Card className="result-placeholder data-placeholder">
            <span>
              <Icon name="chart" size={25} />
            </span>
            <h3>Your prediction will appear here</h3>
            <p>Review your information, then generate your estimate.</p>
          </Card>
        )}
      </div>
    </main>
  );
}
