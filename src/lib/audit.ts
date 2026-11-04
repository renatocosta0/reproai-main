// Audit logging for access to clinical data. Every read/write of sensitive
// records should call this so data governance is demonstrable. Writes a real row
// to the AuditLog table; nothing is simulated.

import { prisma } from "@/lib/db";

export async function audit(actorId: string, action: string, resource: string): Promise<void> {
  await prisma.auditLog.create({ data: { actorId, action, resource } });
}
