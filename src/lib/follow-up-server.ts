// Server-side lifecycle operations for clinician-initiated follow-ups.
// Keeping the opening action here ensures the patient notification and audit
// record are created through the same path as the rest of the care workflow.

import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { canAccessCase } from "@/lib/clinician-scope";
import { dispatchCareNotification } from "@/lib/notifications";

export async function openFollowUpByClinician(
  clinicianId: string,
  coupleId: string,
  note?: string
) {
  if (!(await canAccessCase(clinicianId, coupleId))) {
    throw new Error("This case is not in your care list.");
  }

  const active = await prisma.followUp.findFirst({
    where: {
      coupleId,
      status: { in: ["ALERT_RAISED", "CONSULTATION_REQUESTED", "APPOINTMENT_SUGGESTED", "APPOINTMENT_SCHEDULED", "IN_FOLLOW_UP"] }
    },
    select: { id: true }
  });
  if (active) throw new Error("This case already has an active follow-up.");

  const item = await prisma.followUp.create({
    data: {
      coupleId,
      status: "ALERT_RAISED",
      note: note?.trim() || null
    }
  });

  await audit(clinicianId, "follow_up_opened", `follow_up:${item.id}:couple:${coupleId}`);

  // The preview deliberately contains no clinical details. The recipient sees
  // the clinician's note only after authenticating in their own portal.
  await dispatchCareNotification({
    caseId: coupleId,
    targetRole: "PATIENT",
    actorId: clinicianId,
    type: "FOLLOW_UP_OPENED",
    title: "ReproAI · Care follow-up",
    body: "Your care team recommends a follow-up. Sign in to request a consultation.",
    url: "/patient/overview"
  });

  return item;
}
