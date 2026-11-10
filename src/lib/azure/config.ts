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
    mcp: getMcpConfig() !== null
  };
}