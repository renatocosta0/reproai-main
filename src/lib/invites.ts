// Resolves a registration token to the clinician prescription or partner pairing
// invite it belongs to. Used by GET /api/auth/invite (read-only check for the
// register page) and POST /api/auth/register (which consumes the token).

import { prisma } from "@/lib/db";

export type ResolvedInvite =
  | {
      kind: "CLINIC";
      id: string;
      coupleId: string;
      scope: string;
      allowedEmails: string[];
      name: string | null;
      sex: string | null;
    }
  | {
      kind: "PARTNER";
      id: string;
      coupleId: string | null;
      allowedEmails: string[];
      senderName: string | null;
    };

export async function resolveInviteToken(token: string): Promise<ResolvedInvite | null> {
  const clean = token.trim();
  if (!clean) return null;

  const inv = await prisma.invitation.findUnique({ where: { token: clean } });
  if (inv) {
    if (inv.status !== "PENDING") return null;
    return {
      kind: "CLINIC",
      id: inv.id,
      coupleId: inv.coupleId,
      scope: inv.scope,
      allowedEmails: [inv.email, inv.partnerEmail]
        .filter((e): e is string => Boolean(e))
        .map((e) => e.toLowerCase()),
      name: inv.name,
      sex: inv.sex
    };
  }

  const pair = await prisma.pairingInvite.findUnique({
    where: { token: clean },
    include: { sender: { include: { patientProfile: true } } }
  });
  if (pair) {
    if (pair.status !== "PENDING" || new Date() > pair.expiresAt) return null;
    return {
      kind: "PARTNER",
      id: pair.id,
      coupleId: pair.sender.coupleId,
      allowedEmails: [pair.recipientEmail.toLowerCase()],
      senderName: pair.sender.patientProfile?.name ?? null
    };
  }

  return null;
}
