import Link from "next/link";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icons";
import { buildRecommendations } from "@/lib/guidelines";
import { estimateFertilityWindow } from "@/lib/fertility-window";

export const dynamic = "force-dynamic";

export default async function PatientDashboard() {
  const session = await getSession();
  const coupleId = session?.coupleId ?? null;

  // Load couple data: latest prediction + patient profiles + observations
  const couple = coupleId
    ? await prisma.couple.findUnique({
        where: { id: coupleId },
        include: {
          predictions: { orderBy: { createdAt: "desc" }, take: 1 },
          patients: true,
          observations: { orderBy: { effectiveAt: "desc" }, take: 30 }
        }
      })
    : null;

  const latestPrediction = couple?.predictions[0] ?? null;
  const female = couple?.patients.find((p) => p.sex === "female") ?? null;

  // Lifestyle recommendations derived from real persisted patient data only
  const recs = female
    ? buildRecommendations({
        bmi: female.bmi ?? undefined,
        pcosHistory: female.pcosHistory ?? undefined
      })
    : [];

  // Parse stored factors JSON safely
  let factors: Array<{ feature: string; impact: number }> = [];
  if (latestPrediction?.factors) {
    try {
      factors = JSON.parse(latestPrediction.factors);
    } catch {
      factors = [];
    }
  }

  // Dynamic cycle window calculation if observations exist
  const bbtObs = couple?.observations
    ?.filter((o) => o.code === "8310-5")
    ?.map((o) => ({ date: o.effectiveAt.toISOString(), value: o.value })) || [];

  const sleepObs = couple?.observations
    ?.filter((o) => o.code === "93832-4")
    ?.map((o) => ({ date: o.effectiveAt.toISOString(), hours: o.value })) || [];

  // If there are observations or clinical cycle data, calculate dynamic window
  let dynamicDays: Array<{ day: string; weekday: string; isPeak: boolean }> = [];
  if (bbtObs.length > 0) {
    const latestDate = new Date(bbtObs[0].date);
    const windowRes = estimateFertilityWindow({
      lastPeriodStart: latestDate.toISOString().slice(0, 10),
      temperatures: bbtObs,
      sleepRecords: sleepObs
    });

    if (windowRes && windowRes.windowStart && windowRes.windowEnd) {
      const start = new Date(windowRes.windowStart);
      const ovDate = new Date(windowRes.ovulationDate);
      const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

      for (let i = 0; i < 6; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dynamicDays.push({
          day: String(d.getDate()).padStart(2, "0"),
          weekday: weekdays[d.getDay()],
          isPeak: d.toISOString().slice(0, 10) === ovDate.toISOString().slice(0, 10)
        });
      }
    }
  }

  return (
    <main className="page-main">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Patient workspace</p>
          <h1>Overview</h1>
        </div>
      </div>

      <div className="overview-grid">
        <Card className="prediction-card">
          <div className="card-heading">
            <div>
              <p className="eyebrow">Personalized insight</p>
              <h2>Latest prediction</h2>
            </div>
            {latestPrediction && <span className="status-dot">Current</span>}
          </div>

          {latestPrediction ? (
            <>
              <div className="prediction-value">{latestPrediction.probability}%</div>
              {latestPrediction.confidenceLow != null && latestPrediction.confidenceHigh != null && (
                <p className="confidence">
                  95% CI: {latestPrediction.confidenceLow}–{latestPrediction.confidenceHigh}%
                </p>
              )}
              <p className="clinical-copy">
                Your estimated probability reflects the information currently available. This
                result can support a conversation with your clinician, but it is not a diagnosis.
              </p>
              {factors.length > 0 && (
                <div className="factor-section">
                  <h3>Most influential factors</h3>
                  {factors.map((f) => (
                    <div key={f.feature} className="progress-item">
                      <div>
                        <span>{f.feature}</span>
                        <strong>{Math.round(f.impact * 100)}%</strong>
                      </div>
                      <div className="progress-track">
                        <span style={{ width: `${Math.round(f.impact * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="empty-state">
              <span>
                <Icon name="chart" size={25} />
              </span>
              <h3>No prediction yet</h3>
              <p>
                Add your health and fertility information to generate a personalized estimate.
              </p>
              <Link href="/patient/data-entry" className="button button-primary" style={{ marginTop: 12 }}>
                Go to My data
              </Link>
            </div>
          )}

          <footer>
            Model {latestPrediction?.modelVersion ?? "v1.0"} · Generated{" "}
            {latestPrediction
              ? new Date(latestPrediction.createdAt).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric"
                })
              : "—"}
          </footer>
        </Card>

        <div className="overview-side">
          <Card className="side-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">This cycle</p>
                <h2>Fertility window</h2>
              </div>
              <span className="icon-tile">
                <Icon name="calendar" />
              </span>
            </div>

            {dynamicDays.length > 0 ? (
              <div className="calendar-strip">
                {dynamicDays.map((d) => (
                  <div key={d.day} className={d.isPeak ? "peak" : ""}>
                    <span>{d.weekday}</span>
                    <strong>{d.day}</strong>
                    {d.isPeak && <i />}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: "18px 0 14px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                <p>No cycle parameters or wearable data recorded yet.</p>
                <p style={{ marginTop: 4, fontSize: "12px", color: "#94a3b8" }}>
                  Calculate your fertile window to see your predicted fertile days.
                </p>
              </div>
            )}

            <Link href="/patient/fertility-window" className="inline-link">
              Open fertility window calculator <Icon name="arrow" size={16} />
            </Link>
          </Card>

          <Card className="side-card">
            <div className="card-heading">
              <div>
                <p className="eyebrow">Evidence-based</p>
                <h2>Lifestyle guidance</h2>
              </div>
              <span className="icon-tile">
                <Icon name="leaf" />
              </span>
            </div>
            {recs.length > 0 ? (
              recs.map((r, i) => (
                <div key={r.topic} className="guidance-row">
                  <span className="guidance-icon">
                    <Icon name={i === 0 ? "moon" : "heart"} />
                  </span>
                  <div>
                    <strong>{r.topic}</strong>
                    <p>{r.message}</p>
                    <small>Source: {r.source}</small>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: "18px 0 14px", textAlign: "center", color: "#64748b", fontSize: "13px" }}>
                <p>Personalized guidance will appear once health data is entered.</p>
                <div style={{ marginTop: 10 }}>
                  <Link href="/patient/lifestyle" className="inline-link">
                    Explore lifestyle guidance <Icon name="arrow" size={14} />
                  </Link>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </main>
  );
}
