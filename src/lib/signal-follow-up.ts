// One automatic care-team follow-up per case and signal source (home readings,
// cycle log). Opening notifies the responsible clinicians; when the signal
// settles, an alert that no clinician has acted on yet is closed with an audit
// record. Follow-ups opened by clinicians are never touched.

import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { dispatchCareNotification, type NotificationType } from "@/lib/notifications";

export const SYSTEM_ACTOR = "system:signal-analysis";

export interface SignalSource {
  /** Note prefix that marks follow-ups opened by this source. */
  prefix: string;
  /** Older note prefixes written by earlier versions. */
  legacyPrefixes?: string[];
  notificationType: NotificationType;
  title: string;
  body: string;
  /** Audit actor for automatic actions. */
  actor?: string;
}

export function belongsTo(source: SignalSource, note: string | null | undefined): boolean {
  if (!note) return false;
  return note.startsWith(source.prefix) || (source.legacyPrefixes ?? []).some((p) => note.startsWith(p));
}

export interface SignalSyncResult {
  opened: boolean;
  refreshed: boolean;
  resolved: boolean;
  followUpId: string | null;
}

/**
 * reason: clinician-facing reason when the signal is active, or null.
 * settled: the signal is resolved, so an untouched open alert may be closed.
 */
export async function syncSignalFollowUp(params: {
  source: SignalSource;
  coupleId: string;
  userId: string;
  reason: string | null;
  settled: boolean;
  settledWhy?: string;
}): Promise<SignalSyncResult> {
  const { source, coupleId, userId, reason, settled } = params;
  const actor = source.actor ?? SYSTEM_ACTOR;
  const open = (await prisma.followUp.findMany({ where: { coupleId, status: "ALERT_RAISED" }, orderBy: { createdAt: "desc" } })).find((f) =>
    belongsTo(source, f.note)
  );

  if (reason) {
    const note = source.prefix + reason;
    if (open) {
      if (open.note !== note) await prisma.followUp.update({ where: { id: open.id }, data: { note } });
      return { opened: false, refreshed: open.note !== note, resolved: false, followUpId: open.id };
    }
    const item = await prisma.followUp.create({ data: { coupleId, status: "ALERT_RAISED", note } });
    await audit(actor, "follow_up_opened_by_signal", `follow_up:${item.id}:couple:${coupleId}:user:${userId}`);
    // The preview carries no clinical detail; the reason is visible after sign-in.
    await dispatchCareNotification({
      caseId: coupleId,
      targetRole: "CLINICIAN",
      actorId: userId,
      type: source.notificationType,
      title: source.title,
      body: source.body,
      url: "/clinician/follow-up"
    });
    return { opened: true, refreshed: false, resolved: false, followUpId: item.id };
  }

  if (open && settled) {
    await prisma.followUp.update({
      where: { id: open.id },
      data: { status: "CLOSED", note: `${open.note}\n— Closed automatically on ${new Date().toISOString().slice(0, 10)}: ${params.settledWhy ?? "the signal settled"}.` }
    });
    await audit(actor, "follow_up_auto_resolved", `follow_up:${open.id}:couple:${coupleId}`);
    return { opened: false, refreshed: false, resolved: true, followUpId: open.id };
  }
  return { opened: false, refreshed: false, resolved: false, followUpId: open?.id ?? null };
}
