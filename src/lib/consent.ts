// Granular, revocable consent (Challenge 02, requirement R5).
//
// Each user has one row per purpose. Users without a row get the defaults below,
// which match what they agreed to when they accepted a care prescription:
// their own care data is used for their care and shared with their clinician;
// population analytics is opt-in. Every change is audited.

import { prisma } from "@/lib/db";
import { audit } from "@/lib/audit";

export const PURPOSES = ["CLINICIAN_ACCESS", "LAB_RESULTS", "WEARABLES", "PARTNER_SHARING", "POPULATION_ANALYTICS"] as const;
export type Purpose = (typeof PURPOSES)[number];

export const PURPOSE_INFO: Record<Purpose, { title: string; description: string; defaultGranted: boolean }> = {
  CLINICIAN_ACCESS: {
    title: "Share my record with my care team",
    description: "Your prescribing clinician can see your profile, results and readings to support your care. Without this, they see only that you are enrolled.",
    defaultGranted: true
  },
  LAB_RESULTS: {
    title: "Use my laboratory and ultrasound results",
    description: "Results such as AMH, antral follicle count and semen analysis are stored and used for your assessments.",
    defaultGranted: true
  },
  WEARABLES: {
    title: "Store my temperature and sleep readings",
    description: "Readings you log or import are kept to show patterns over time.",
    defaultGranted: true
  },
  PARTNER_SHARING: {
    title: "Share with my linked partner",
    description: "When you are linked, your partner sees your name and age and any joint assessment. Your own results and readings are never shared.",
    defaultGranted: true
  },
  POPULATION_ANALYTICS: {
    title: "Include me in anonymous service statistics",
    description: "Counts and averages that help the health system see who benefits from earlier advice. You are never identifiable.",
    defaultGranted: false
  }
};

export const NON_DISCRIMINATION =
  "Your reproductive health information is used only for your care and, if you agree, for anonymous service statistics. It is never used for employment, insurance or any decision unrelated to your health care.";

export type ConsentMap = Record<Purpose, { granted: boolean; updatedAt: string | null }>;

export async function getConsents(userId: string): Promise<ConsentMap> {
  const rows = await prisma.consent.findMany({ where: { userId } });
  const map = {} as ConsentMap;
  for (const p of PURPOSES) {
    const row = rows.find((r) => r.purpose === p);
    map[p] = { granted: row ? row.granted : PURPOSE_INFO[p].defaultGranted, updatedAt: row ? row.updatedAt.toISOString() : null };
  }
  return map;
}

export async function hasConsent(userId: string, purpose: Purpose): Promise<boolean> {
  const row = await prisma.consent.findUnique({ where: { userId_purpose: { userId, purpose } } });
  return row ? row.granted : PURPOSE_INFO[purpose].defaultGranted;
}

/** Bulk check for many users (defaults applied). */
export async function consentingUserIds(userIds: string[], purpose: Purpose): Promise<Set<string>> {
  const rows = await prisma.consent.findMany({ where: { userId: { in: userIds }, purpose } });
  return new Set(
    userIds.filter((id) => {
      const row = rows.find((r) => r.userId === id);
      return row ? row.granted : PURPOSE_INFO[purpose].defaultGranted;
    })
  );
}

export async function setConsent(userId: string, purpose: Purpose, granted: boolean): Promise<void> {
  const now = new Date();
  await prisma.consent.upsert({
    where: { userId_purpose: { userId, purpose } },
    update: { granted, ...(granted ? { grantedAt: now, revokedAt: null } : { revokedAt: now }) },
    create: { userId, purpose, granted, ...(granted ? { grantedAt: now } : { revokedAt: now }) }
  });
  await audit(userId, granted ? "consent_granted" : "consent_revoked", `consent:${purpose}`);
}

export function isPurpose(x: unknown): x is Purpose {
  return typeof x === "string" && (PURPOSES as readonly string[]).includes(x);
}
