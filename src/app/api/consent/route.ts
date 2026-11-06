import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

// Records informed consent and couple partner names for the authenticated user.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { femaleName, maleName } = body;

  const consentAt = new Date();
  await prisma.user.update({
    where: { id: session.userId },
    data: { consentAt }
  });

  // If user is associated with a couple, ensure/update the female & male patient records
  if (session.coupleId) {
    // 1. Female partner
    const existingFemale = await prisma.patient.findFirst({
      where: { coupleId: session.coupleId, sex: "female" }
    });

    if (existingFemale) {
      if (femaleName) {
        await prisma.patient.update({
          where: { id: existingFemale.id },
          data: { name: femaleName.trim() }
        });
      }
    } else if (femaleName) {
      await prisma.patient.create({
        data: {
          coupleId: session.coupleId,
          sex: "female",
          name: femaleName.trim()
        }
      });
    }

    // 2. Male partner
    const existingMale = await prisma.patient.findFirst({
      where: { coupleId: session.coupleId, sex: "male" }
    });

    if (existingMale) {
      if (maleName) {
        await prisma.patient.update({
          where: { id: existingMale.id },
          data: { name: maleName.trim() }
        });
      }
    } else if (maleName) {
      await prisma.patient.create({
        data: {
          coupleId: session.coupleId,
          sex: "male",
          name: maleName.trim()
        }
      });
    }
  }

  await audit(session.userId, "consent", `user:${session.userId}`);
  return NextResponse.json({ ok: true, consentAt: consentAt.toISOString() });
}
