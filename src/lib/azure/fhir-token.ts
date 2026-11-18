// Access tokens for Azure Health Data Services (FHIR), obtained from Microsoft Entra ID with
// the OAuth 2.0 client-credentials flow. The client secret is sent only to Entra ID, never to
// the FHIR server; the FHIR server receives the short-lived access token.

import type { AzureFhirConfig } from "./config";

let cached: { key: string; token: string; expiresAt: number } | null = null;

export function tokenRequest(cfg: Required<AzureFhirConfig>): { url: string; body: URLSearchParams } {
  return {
    url: `https://login.microsoftonline.com/${encodeURIComponent(cfg.tenantId)}/oauth2/v2.0/token`,
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: cfg.clientId,
      client_secret: cfg.clientSecret,
      scope: `${cfg.endpoint}/.default`
    })
  };
}

export async function getAzureFhirToken(cfg: Required<AzureFhirConfig>, signal?: AbortSignal): Promise<string> {
  const key = `${cfg.tenantId}|${cfg.clientId}|${cfg.endpoint}`;
  if (cached && cached.key === key && cached.expiresAt > Date.now() + 60_000) return cached.token;

  const { url, body } = tokenRequest(cfg);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal
  });
  if (!res.ok) throw new Error(`Entra ID token request failed (HTTP ${res.status})`);
  const data = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!data.access_token) throw new Error("Entra ID returned no access token");

  cached = { key, token: data.access_token, expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000 };
  return data.access_token;
}
