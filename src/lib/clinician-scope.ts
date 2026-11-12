// Clinician access scope: a clinician sees only the care cases they prescribed.
// A case is in scope if the clinician issued its invitation, or invited any of
// its current members (members can move to a shared couple when they pair).

import { prisma } from "@/lib/db";

export async function clinicianCaseIds(clinicianId: string): Promise<Set<string>> {
  const invites = await prisma.invitation.findMany({
    where: { invitedBy: clinicianId },
    select: { coupleId: true, email: true, partnerEmail: true }
  });
  const ids = new Set(invites.map((i) => i.coupleId));
  const emails = invites.flatMap((i) => [i.email, i.partnerEmail]).filter((e): e is string => Boolean(e));
  if (emails.length) {
    const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { coupleId: true } });
    for (const u of users) if (u.coupleId) ids.add(u.coupleId);
  }
  return ids;
}

export async function canAccessCase(clinicianId: string, coupleId: string): Promise<boolean> {
  return (await clinicianCaseIds(clinicianId)).has(coupleId);
}

/** Can this clinician access this patient user (via any in-scope case)? */
export async function canAccessUser(clinicianId: string, userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { coupleId: true } });
  return Boolean(user?.coupleId) && (await canAccessCase(clinicianId, user!.coupleId!));
}
