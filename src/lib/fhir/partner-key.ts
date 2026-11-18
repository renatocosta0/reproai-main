// Partner key for the inbound EHR / HIE endpoint (/api/integrations/ehr).
// Only REPROAI_PARTNER_API_KEY is accepted: never the session secret, never the demo key.

import { createHash, timingSafeEqual } from "node:crypto";

const DEMO_KEY = "sk_reproai_partner_uae_demo_key";
const MIN_KEY_LENGTH = 32;

/** The configured partner key, or null when the endpoint is not enabled. */
export function partnerKey(): string | null {
  const key = process.env.REPROAI_PARTNER_API_KEY?.trim();
  if (!key || key === DEMO_KEY || key.length < MIN_KEY_LENGTH) return null;
  return key;
}

function sameSecret(a: string, b: string): boolean {
  // Hash both so the comparison is constant time whatever the lengths.
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function isAuthorized(headers: Headers, key: string): boolean {
  const raw = headers.get("authorization") || headers.get("x-api-key");
  if (!raw) return false;
  const token = raw.replace(/^Bearer\s+/i, "").trim();
  return token.length > 0 && sameSecret(token, key);
}
