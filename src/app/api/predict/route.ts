import { NextRequest, NextResponse } from "next/server";
import { predict, type PredictionInput } from "@/lib/ml-client";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

// POST /api/predict — clinician "what-if" simulation. Stateless: nothing is
// saved and nothing reaches the patient. Real assessments are created from the
// patient's verified record through POST /api/clinician/cases/:id/assess and
// released only after clinician review.
//
// Inputs are passed through exactly as given: missing values stay missing and
// the ML service answers insufficient_data rather than guessing.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    if (session.role !== "CLINICIAN") {
      return NextResponse.json(
        { error: "Assessments are run by your clinician from verified results." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const num = (x: unknown) => (typeof x === "number" && Number.isFinite(x) ? x : null);
    const input: PredictionInput = {
      age: num(body.age),
      bmi: num(body.bmi),
      amh: num(body.amh),
      sperm_count: num(body.sperm_count),
      antral_follicle_count: num(body.antral_follicle_count),
      sex: body.sex === "male" ? "male" : "female",
      scope: body.scope === "COUPLE" ? "COUPLE" : "INDIVIDUAL",
      pcos_history: typeof body.pcos_history === "boolean" ? body.pcos_history : null,
      infertility_duration_months: num(body.infertility_duration_months),
      prior_cycles: num(body.prior_cycles)
    };

    const result = await predict(input);
    await audit(session.userId, "simulation_run", `scope:${input.scope}:status:${result.status}`);
    return NextResponse.json({ ...result, simulation: true });
  } catch (err) {
    console.error("[POST /api/predict] error:", err);
    return NextResponse.json({ error: "The assessment service is not reachable right now." }, { status: 502 });
  }
}
