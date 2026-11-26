// In-app care notification dispatch.

import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";
import { consentingUserIds } from "@/lib/consent";

export type NotificationType =
  | "ASSESSMENT_RELEASED"
  | "FOLLOW_UP_OPENED"
  | "INSIGHT_UPDATE"
  | "LAB_VERIFIED"
  | "APPOINTMENT_REQUESTED"
  | "APPOINTMENT_ACCEPTED"
  | "APPOINTMENT_DECLINED"
  | "APPOINTMENT_SUGGESTED"
  | "APPOINTMENT_CONFIRMED"
  | "APPOINTMENT_CANCELLED"
  | "WEARABLE_ALERT"
  | "CYCLE_ALERT"
  | "CYCLE_REMINDER"
  | "LAB_REVIEW_DUE"
  | "WEEKLY_SUMMARY";

export interface CareNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: NotificationType;
  url: string;
  read: boolean;
  createdAt: string;
}

function toCareNotification(record: {
  id: string;
  userId: string;
  title: string;
  body: string;
  type: string;
  url: string;
  readAt: Date | null;
  createdAt: Date;
}): CareNotification {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    body: record.body,
    type: record.type as NotificationType,
    url: record.url,
    read: record.readAt !== null,
    createdAt: record.createdAt.toISOString()
  };
}

/** Retrieve the latest notifications for an authenticated user. */
export async function getNotificationsForUser(userId: string): Promise<CareNotification[]> {
  const records = await prisma.careNotification.findMany({
    where: { userId },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: 30
  });
  return records.map(toCareNotification);
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  return prisma.careNotification.count({ where: { userId, readAt: null } });
}

/** Mark a notification as read only for its owner. Repeated calls are safe. */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
  const existing = await prisma.careNotification.findFirst({
    where: { id: notificationId, userId },
    select: { readAt: true }
  });
  if (!existing) return false;
  if (existing.readAt) return true;

  await prisma.careNotification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() }
  });
  return true;
}

export interface DispatchNotificationParams {
  caseId?: string;
  targetUserId?: string;
  targetRole?: "PATIENT" | "CLINICIAN";
  actorId: string;
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
}

/** Find all clinicians responsible for a care case. */
async function findClinicianIdsForCase(caseId: string): Promise<string[]> {
  const clinicianIds = new Set<string>();

  if (prisma.invitation?.findMany) {
    const invitations = await prisma.invitation.findMany({
      where: { coupleId: caseId },
      select: { invitedBy: true }
    });
    for (const inv of invitations) {
      if (inv.invitedBy) clinicianIds.add(inv.invitedBy);
    }
  }

  if (clinicianIds.size === 0 && prisma.user?.findMany && prisma.invitation?.findMany) {
    const users = await prisma.user.findMany({
      where: { coupleId: caseId },
      select: { email: true }
    });
    const emails = users.map((u) => u.email).filter(Boolean);
    if (emails.length > 0) {
      const emailInvites = await prisma.invitation.findMany({
        where: { OR: [{ email: { in: emails } }, { partnerEmail: { in: emails } }] },
        select: { invitedBy: true }
      });
      for (const inv of emailInvites) {
        if (inv.invitedBy) clinicianIds.add(inv.invitedBy);
      }
    }
  }

  return Array.from(clinicianIds);
}

/** Dispatch an in-app notification to role-checked recipients. */
export async function dispatchCareNotification(params: DispatchNotificationParams): Promise<CareNotification[]> {
  const { caseId, targetUserId, targetRole = "PATIENT", actorId, type, title, body, url = "/patient/overview" } = params;
  const recipientIds = new Set<string>();

  if (targetUserId) {
    const directRecipient = await prisma.user.findFirst({
      where: {
        id: targetUserId,
        role: targetRole,
        ...(caseId ? { coupleId: caseId } : {})
      },
      select: { id: true }
    });
    if (directRecipient) recipientIds.add(directRecipient.id);
  }

  if (caseId) {
    if (targetRole === "CLINICIAN") {
      // Route exclusively to clinicians
      const clinicianIds = await findClinicianIdsForCase(caseId);
      for (const id of clinicianIds) {
        recipientIds.add(id);
      }
    } else {
      // Route exclusively to patients
      const members = await prisma.user.findMany({
        where: { coupleId: caseId, role: "PATIENT" },
        select: { id: true }
      });
      const sharingMembers = type === "ASSESSMENT_RELEASED"
        ? await consentingUserIds(members.map((m) => m.id), "PARTNER_SHARING")
        : null;
      const jointAssessmentAllowed = !sharingMembers || sharingMembers.size === members.length;
      if (jointAssessmentAllowed) {
        for (const m of members) recipientIds.add(m.id);
      }
    }
  }

  // Never send the notification back to the person who triggered the action
  if (actorId) {
    recipientIds.delete(actorId);
  }

  const createdNotifications: CareNotification[] = [];

  for (const userId of recipientIds) {
    const record = await prisma.careNotification.create({
      data: { userId, title, body, type, url }
    });
    createdNotifications.push(toCareNotification(record));

    await audit(actorId, "notification_dispatched", `type:${type}:recipient:${userId}`);
  }

  return createdNotifications;
}
