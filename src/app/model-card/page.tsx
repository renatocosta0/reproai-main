import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { getModelInfo, type ModelInfo } from "@/lib/ml-client";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Model card · ReproAI",
  description: "What the ReproAI scoring model is, what it is for, how it explains itself and its limitations."
};

// Public model card. Every fact comes live from the ML service (GET /model-info),
// so the card always matches the model version actually running. If the service
// is unreachable the page says so instead of showing stale text.
export default async function ModelCardPage() {
  let info: ModelInfo | null = null;
  try {
    info = await getModelInfo();
  } catch {
    info = null;
  }

  return (
    <div className="landing model-card">
      <header className="landing-nav">
        <Link href="/" className="brand-home" aria-label="ReproAI home">
          <Logo />
        </Link>
        <Link className="secondary" href="/">
          <ArrowLeft size={15} aria-hidden className="flip-rtl" /> Home
        </Link>
      </header>

      <main className="landing-section mc-body">
        <p className="eyebrow">Model card</p>
        <h1>{info?.model_name ?? "ReproAI scoring model"}</h1>

        {!info ? (
          <p className="mc-callout">
            The model service is not reachable right now, so the model card cannot be shown. It is read live from the
            service so that it always describes the version in use.
          </p>
        ) : (
          <>
            <dl className="mc-meta">
              <div><dt>Version</dt><dd><code>{info.version}</code></dd></div>
              <div><dt>Evidence status</dt><dd>{info.evidence_status}</dd></div>
              <div><dt>Performance claims</dt><dd>{info.performance_claims}</dd></div>
            </dl>

            <Section title="Intended use">
              <p>{info.intended_use}</p>
              {info.intended_users?.length ? <List items={info.intended_users} /> : null}
            </Section>

            {info.out_of_scope?.length ? (
              <Section title="Not for">
                <List items={info.out_of_scope} />
              </Section>
            ) : null}

            {info.outcome && (
              <Section title="What the number means">
                <p>{info.outcome}</p>
              </Section>
            )}

            <Section title="How it works">
              <p>{info.architecture}.</p>
              {info.inputs && (
                <table className="mc-table">
                  <thead>
                    <tr><th>Assessment</th><th>Required (no estimate without them)</th><th>Optional</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(info.inputs).map(([k, v]) => (
                      <tr key={k}>
                        <td>{k.replace("INDIVIDUAL", "Individual").replace("COUPLE", "Couple")}</td>
                        <td>{v.required.join(", ")}</td>
                        <td>{v.optional.join(", ") || "None"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p>
                <strong>Missing data.</strong> If a required input is missing, the service returns no estimate and names what
                is missing. Missing optional inputs: {info.missing_data_policy.optional_effect}.
              </p>
            </Section>

            {info.explanation_method && (
              <Section title="How it explains a result">
                <p>{info.explanation_method}</p>
              </Section>
            )}

            {info.uncertainty && (
              <Section title="Uncertainty">
                <p>{info.uncertainty}</p>
              </Section>
            )}

            <Section title="Evidence sources">
              <List items={info.evidence_sources} />
            </Section>

            {info.known_limitations?.length ? (
              <Section title="Known limitations">
                <List items={info.known_limitations} />
              </Section>
            ) : null}

            {info.next_steps && (
              <Section title="Before clinical use">
                <p>{info.next_steps}</p>
              </Section>
            )}

            <Section title="Safeguards around the model">
              <List
                items={[
                  "Patients never see an estimate until a clinician has reviewed and released it, and then see a tier and percentile rather than the probability.",
                  "Lab values are entered or verified by clinicians and carry their source and date; patients cannot write lab values.",
                  "Every estimate is stored with the exact inputs and model version that produced it.",
                  "The assistants never calculate estimates; they explain recorded and released information and cite their sources."
                ]}
              />
              <p className="mc-note">
                Clinicians can see live panel measures, a labelled simulation and the assistant evaluation on the Evidence
                &amp; safety page.
              </p>
            </Section>
          </>
        )}
      </main>

      <footer className="landing-footer">
        <p>
          Prototype for the Abu Dhabi Future Health Digital Innovation Challenge (Challenge 02, Fertility). Not clinically
          validated and not a diagnostic device.
        </p>
      </footer>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mc-section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul>
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}
