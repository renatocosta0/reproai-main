import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { predict, type PredictionInput } from "@/lib/ml-client";

// POST /api/patient/what-if { bmi } — illustrative only, nothing is saved.
// Re-scores the patient's latest RELEASED individual assessment with one
// modifiable input (BMI) changed and every other input held fixed. Returns the
// change in BMI's contribution, not a new probability, so the patient's
// official, clinician-reviewed result is never replaced.
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "PATIENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json().catch(() => null);
    const bmi = Number(body?.bmi);
    if (!Number.isFinite(bmi) || bmi < 16 || bmi > 45) {
      return NextResponse.json({ error: "BMI must be between 16 and 45" }, { status: 400 });
    }

    const latest = await prisma.prediction.findFirst({
      where: { userId: session.userId, scope: "INDIVIDUAL", status: "RELEASED", inputs: { not: null } },
      orderBy: { createdAt: "desc" }
    });
    const profile = await prisma.patient.findUnique({ where: { userId: session.userId } });
    if (!latest || !profile?.sex) {
      return NextResponse.json({ error: "A released assessment is needed before you can explore what-ifs." }, { status: 409 });
    }

    const inputs = JSON.parse(latest.inputs!) as Record<string, { value: number | boolean }>;
    const v = (k: string) => (inputs[k] ? inputs[k].value : null);
    const base: PredictionInput = {
      scope: "INDIVIDUAL",
      sex: profile.sex === "male" ? "male" : "female",
      age: v("age") as number,
      amh: v("amh") as number | null,
      antral_follicle_count: v("antral_follicle_count") as number | null,
      sperm_count: v("sperm_count") as number | null,
      bmi: v("bmi") as number | null,
      pcos_history: v("pcos_history") as boolean | null,
      infertility_duration_months: v("infertility_duration_months") as number | null
    };
    const [before, after] = await Promise.all([predict(base), predict({ ...base, bmi })]);
    const phi = (r: typeof before) => r.factors.find((f) => f.feature === "BMI")?.shapley_value ?? 0;

    return NextResponse.json({
      illustrative: true,
      currentBmi: base.bmi,
      simulatedBmi: bmi,
      bmiEffectNow: phi(before),
      bmiEffectSimulated: phi(after),
      // Direction only: the size is on the log-odds scale and not a probability.
      direction: phi(after) - phi(before) > 0.01 ? "better" : phi(after) - phi(before) < -0.01 ? "worse" : "similar"
    });
  } catch (error: any) {
    console.error("[POST /api/patient/what-if] error:", error);
    return NextResponse.json({ error: "The simulator is not available right now." }, { status: 502 });
  }
}
