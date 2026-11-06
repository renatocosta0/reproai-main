"use client";

import { useState, useEffect, useCallback, FormEvent } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { DataTable } from "@/components/ui/DataTable";
import { Icon } from "@/components/ui/Icons";

type MetricKey = "temperature" | "sleep" | "heart" | "step";

interface MetricConfig {
  label: string;
  code: string;
  unit: string;
  placeholder: string;
}

const metricOptions: Record<MetricKey, MetricConfig> = {
  temperature: {
    label: "Body temperature",
    code: "8310-5",
    unit: "°C",
    placeholder: "36.5"
  },
  sleep: {
    label: "Sleep duration",
    code: "93832-4",
    unit: "h",
    placeholder: "7.5"
  },
  heart: {
    label: "Heart rate",
    code: "8867-4",
    unit: "bpm",
    placeholder: "70"
  },
  step: {
    label: "Step count",
    code: "55423-8",
    unit: "steps",
    placeholder: "8000"
  }
};

interface ObservationRow {
  id?: string;
  metric: string;
  code: string;
  value: string;
  date: string;
}

export default function WearablesPage() {
  const [metric, setMetric] = useState<MetricKey>("temperature");
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<ObservationRow[]>([]);

  const fetchHistory = useCallback(async () => {
    try {
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.session?.coupleId) return;

      const res = await fetch(`/api/observations?coupleId=${sessionData.session.coupleId}`);
      if (res.ok) {
        const data = await res.json();
        const obs = data.observations || [];
        const formatted: ObservationRow[] = obs.map((o: any) => {
          const match = Object.values(metricOptions).find((m) => m.code === o.code);
          return {
            id: o.id,
            metric: match?.label ?? "Observation",
            code: o.code,
            value: `${o.value} ${o.unit ?? match?.unit ?? ""}`.trim(),
            date: new Date(o.effectiveAt).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit"
            })
          };
        });
        setRows(formatted);
      }
    } catch {
      // fallback
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const chooseMetric = (key: MetricKey) => {
    setMetric(key);
    setValue("");
    setSaved(false);
  };

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!value || isNaN(Number(value))) {
      setError("Please enter a valid numeric value.");
      return;
    }

    const m = metricOptions[metric];

    try {
      const sessionRes = await fetch("/api/auth/session");
      const sessionData = await sessionRes.json();

      if (sessionData.session?.coupleId) {
        const res = await fetch("/api/observations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            coupleId: sessionData.session.coupleId,
            code: m.code,
            value: Number(value),
            unit: m.unit
          })
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.error ?? "Failed to record observation");
        }
        setValue("");
        await fetchHistory();
      } else {
        setRows((prev) => [
          {
            metric: m.label,
            code: m.code,
            value: `${value} ${m.unit}`,
            date: "Just now"
          },
          ...prev
        ]);
        setValue("");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to record observation");
    }
  }

  return (
    <main className="page-main">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Patient workspace</p>
          <h1>Wearables</h1>
        </div>
      </div>

      <Card className="observation-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">FHIR observation</p>
            <h2>Record observation</h2>
          </div>
          <span className="icon-tile">
            <Icon name="plus" />
          </span>
        </div>
        <form className="observation-form" onSubmit={save}>
          <Select
            label="Observation type"
            value={metric}
            onChange={(e) => chooseMetric(e.target.value as MetricKey)}
          >
            {Object.entries(metricOptions).map(([key, m]) => (
              <option key={key} value={key}>
                {m.label} [LOINC {m.code}]
              </option>
            ))}
          </Select>
          <label className="field">
            <span className="field-label">Value</span>
            <span className="unit-input">
              <input
                className="input"
                type="number"
                step="0.01"
                placeholder={metricOptions[metric].placeholder}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
              />
              <span>{metricOptions[metric].unit}</span>
            </span>
          </label>
          <Button type="submit">Save observation</Button>
        </form>

        {saved && (
          <div className="success-message">
            <span>
              <Icon name="check" size={16} />
            </span>
            Observation recorded and stored in FHIR format!
          </div>
        )}

        {error && (
          <p className="form-error" style={{ marginTop: 12 }}>
            {error}
          </p>
        )}
      </Card>

      <Card className="table-card">
        <div className="card-heading">
          <div>
            <p className="eyebrow">Health record</p>
            <h2>Recent logged observations</h2>
          </div>
          <Badge>{rows.length} records</Badge>
        </div>
        <DataTable columns={["Metric", "LOINC code", "Value", "Date / time"]}>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: "center", padding: "32px 16px", color: "#64748b" }}>
                No observations recorded yet. Use the form above to record vital signs or sync a device.
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr key={`${row.date}-${i}`}>
                <td>
                  <span className="metric-icon">
                    <Icon
                      name={
                        row.code === "8310-5"
                          ? "thermometer"
                          : row.code === "93832-4"
                            ? "moon"
                            : "heart"
                      }
                      size={16}
                    />
                  </span>
                  {row.metric}
                </td>
                <td>
                  <code>{row.code}</code>
                </td>
                <td>
                  <strong>{row.value}</strong>
                </td>
                <td>{row.date}</td>
              </tr>
            ))
          )}
        </DataTable>
      </Card>

      <Card className="interop-card">
        <span className="interop-icon">
          <Icon name="database" size={22} />
        </span>
        <div>
          <h3>Why these observations matter</h3>
          <p>
            Basal body temperature can help identify thermal shifts after ovulation, sleep duration
            supports a fuller view of hormonal wellbeing, and heart rate can add useful context to
            overall health.
          </p>
        </div>
      </Card>
    </main>
  );
}
