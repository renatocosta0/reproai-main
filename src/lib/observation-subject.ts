// Whose record a temperature or sleep reading belongs to. Patients always write
// into their own record. A clinician writes for a named patient in a case in
// their scope (or the only patient in that case), and only when that patient
// has agreed to store wearable readings. The reading is never stored under the
// clinician's own user id.

import { prisma } from "@/lib/db";
import { hasConsent } from "@/lib/consent";
import { canAccessCase } from "@/lib/clinician-scope";
import type { SessionPayload } from "@/lib/auth";

export type ObservationSubject =
  | { ok: true; userId: string; coupleId: string | null }
  | { ok: false; status: 400 | 403; error: string };

export async function resolveObservationSubject(
  session: SessionPayload,
  requestedCoupleId: unknown,
  requestedUserId: unknown
): Promise<ObservationSubject> {
  if (session.role !== "CLINICIAN") {
    return { ok: true, userId: session.userId, coupleId: session.coupleId ?? null };
  }

  const coupleId = typeof requestedCoupleId === "string" && requestedCoupleId ? requestedCoupleId : null;
  if (!coupleId || !(await canAccessCase(session.userId, coupleId))) {
    return { ok: false, status: 403, error: "Forbidden: this case is not in your scope" };
  }

  const members = await prisma.user.findMany({ where: { coupleId, role: "PATIENT" }, select: { id: true } });
  let userId: string | null = null;
  if (typeof requestedUserId === "string" && requestedUserId) {
    userId = members.some((m) => m.id === requestedUserId) ? requestedUserId : null;
    if (!userId) return { ok: false, status: 400, error: "This patient is not a member of the case." };
  } else if (members.length === 1) {
    userId = members[0].id;
  } else {
    return { ok: false, status: 400, error: "Choose the patient (userId) these readings belong to." };
  }

  if (!(await hasConsent(userId, "WEARABLES"))) {
    return { ok: false, status: 403, error: "This patient has not agreed to store temperature and sleep readings." };
  }
  return { ok: true, userId, coupleId };
}
