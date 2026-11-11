// Response shapes of the clinician API routes, as consumed by the UI.

import type { ObservationRecord, PatientProfile, ShapFactor } from "@/types/patient";

export interface CasePrediction {
  id: string;
  probability: number;
  confidenceLow: number | null;
  confidenceHigh: number | null;
  tier: string | null;
  scope: string;
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
  impactMetrics: {
    totalCouples: number;
    lowResponseCases: number;
    estimatedSavingsUSD: number;
    cyclesOptimized: number;
    ivfCycleCost: number;
  };
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

export interface CaseDetail {
  id: string;
  createdAt: string;
  patients: PatientProfile[];
  users: { id: string; email: string; createdAt: string; consentAt: string | null }[];
  predictions: (CasePrediction & { userId: string | null; modelVersion: string | null })[];
  observations: ObservationRecord[];
  followUps: { id: string; status: string; note: string | null; createdAt: string; updatedAt: string }[];
  invitation: { scope: string; status: string; notes: string | null; createdAt: string; acceptedAt: string | null } | null;
}

export interface InviteResponse {
  ok: true;
  scope: "INDIVIDUAL" | "COUPLE";
  invitationToken: string;
  inviteUrl: string;
  recipientEmail: string;
  partnerEmail: string | null;
}
