// Central Azure configuration. Reads from the environment and reports whether
// each Azure capability is configured. Nothing here mocks Azure; when values are
// missing the features stay disabled and callers degrade honestly.

export interface AzureOpenAIConfig {
  endpoint: string;
  apiKey?: string;
  deployment: string;
  apiVersion: string;
}

export interface AzureSearchConfig {
  endpoint: string;
  apiKey: string;
  index: string;
}

export interface AzureFhirConfig {
  endpoint: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
}

export interface MalaffiHieConfig {
  gatewayUrl: string;
  facilityId: string;
  partnerApiKey?: string;
}

export function getAzureOpenAIConfig(): AzureOpenAIConfig | null {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT;
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT;
  if (!endpoint || !deployment) return null;
  return {
    endpoint: endpoint.replace(/\/$/, ""),
    apiKey: process.env.AZURE_OPENAI_API_KEY || undefined,
    deployment,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION || "2024-10-21"
  };
}

export function getAzureSearchConfig(): AzureSearchConfig | null {
  const endpoint = process.env.AZURE_SEARCH_ENDPOINT;
  const apiKey = process.env.AZURE_SEARCH_API_KEY;
  const index = process.env.AZURE_SEARCH_INDEX;
  if (!endpoint || !apiKey || !index) return null;
  return { endpoint: endpoint.replace(/\/$/, ""), apiKey, index };
}

export function getAzureFhirConfig(): AzureFhirConfig | null {
  const endpoint = process.env.AZURE_FHIR_ENDPOINT;
  if (!endpoint) return null;
  return {
    endpoint: endpoint.replace(/\/$/, ""),
    tenantId: process.env.AZURE_FHIR_TENANT_ID || undefined,
    clientId: process.env.AZURE_FHIR_CLIENT_ID || undefined,
    clientSecret: process.env.AZURE_FHIR_CLIENT_SECRET || undefined
  };
}

export function getMalaffiHieConfig(): MalaffiHieConfig | null {
  const gatewayUrl = process.env.MALAFFI_HIE_GATEWAY_URL;
  const facilityId = process.env.MALAFFI_FACILITY_ID;
  if (!gatewayUrl || !facilityId) return null;
  return {
    gatewayUrl: gatewayUrl.replace(/\/$/, ""),
    facilityId,
    partnerApiKey: process.env.REPROAI_PARTNER_API_KEY || undefined
  };
}

export interface McpConfig {
  url: string;
  token?: string;
}

export function getMcpConfig(): McpConfig | null {
  const url = process.env.MCP_SERVER_URL;
  if (!url) return null;
  return { url: url.replace(/\/$/, ""), token: process.env.MCP_SERVER_TOKEN || undefined };
}

export function azureStatus() {
  return {
    openAI: getAzureOpenAIConfig() !== null,
    search: getAzureSearchConfig() !== null,
    fhir: getAzureFhirConfig() !== null,
    malaffi: getMalaffiHieConfig() !== null,
    mcp: getMcpConfig() !== null
  };
}
