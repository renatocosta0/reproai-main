import { NextRequest, NextResponse } from "next/server";
import { predict, PredictionInput } from "@/lib/ml-client";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PredictionInput;
    const result = await predict(body);
    return NextResponse.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
