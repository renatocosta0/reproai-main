// Response shapes of the clinician API routes, as consumed by the UI.

import type { ObservationRecord, PatientProfile, ShapFactor } from "@/types/patient";

export interface CasePrediction {
  id: string;
  probability: number;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  tier: string | null;
  scope: string;
  /** DRAFT while it waits for clinician review; RELEASED once the patient can see it. */
  status?: string;
  preservationGuidance: string | null;
  factors: ShapFactor[] | null;
  createdAt: string;
}

export interface CaseItem {
  id: string;
  displayName: string;
  createdAt: string;
  scope: "INDIVIDUAL" | "COUPLE";
  isPaired: boolean;
  patients: PatientProfile[];
  users: { id: string; email: string; createdAt: string }[];
  latestPrediction: CasePrediction | null;
  activeAlert: { id: string; status: string; note: string | null; createdAt: string } | null;
  recentObservationsCount: number;
  invitationStatus: string;
  invitationScope: string;
}

export interface DirectoryResponse {
  individuals: CaseItem[];
  couples: CaseItem[];
  counts: { total: number; individuals: number; couples: number; activeAlerts: number };
  /** Cases whose latest assessment is a draft waiting for clinician review. */
  awaitingReview: number;
}

export interface FollowUpItem {
  id: string;
  coupleId: string;
  caseId: string;
  status: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  patients: { name: string | null; sex: string | null }[];
  emails: string[];
  latestProbability: number | null;
}

export interface CaseMember {
  userId: string;
  email: string;
  joinedAt: string;
  consentAt: string | null;
  clinicianAccess: boolean;
  name: string | null;
  sex: "female" | "male" | null;
  profile: import("@/types/record").RecordProfile | null;
  labs: import("@/types/record").LabPoint[];
  options: import("@/types/record").PathwayOption[];
  consents: import("@/types/record").ConsentMap | null;
  observationsSummary: { temperatureReadings: number; sleepNights: number; meanSleepHours: number | null; bbtStatus: string; bbtShift: number } | null;
  observations: ObservationRecord[];
}

export interface CaseDetail {
  id: string;
  createdAt: string;
  isCouple: boolean;
  invitation: {
    scope: string;
    status: string;
    notes: string | null;
    email: string | null;
    partnerEmail: string | null;
    createdAt: string;
    acceptedAt: string | null;
  } | null;
  members: CaseMember[];
  assessments: import("@/types/record").AssessmentView[];
  followUps: { id: string; status: string; note: string | null; createdAt: string; updatedAt: string }[];
}

export interface InviteResponse {
  ok: true;
  scope: "INDIVIDUAL" | "COUPLE";
  invitationToken: string;
  inviteUrl: string;
  recipientEmail: string;
  partnerEmail: string | null;
  /** Whether the activation link was emailed (configured = an email provider is set up). */
  emailDelivery?: { configured: boolean; sent: string[]; failed: string[] };
}
