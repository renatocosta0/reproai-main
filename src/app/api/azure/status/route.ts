import { NextResponse } from "next/server";
import { azureStatus, getAzureOpenAIConfig, getAzureFhirConfig, getMalaffiHieConfig } from "@/lib/azure/config";
import { getGroqConfig } from "@/lib/groq/client";

// Reports which LLM/search/health data capabilities are configured.
// Useful for a demo readiness check and for the UI to show provider status.
export async function GET() {
  const azure = azureStatus();
  const azureCfg = getAzureOpenAIConfig();
  const fhirCfg = getAzureFhirConfig();
  const malaffiCfg = getMalaffiHieConfig();
  const groqCfg = getGroqConfig();

  // Which provider will answer questions right now, and with which model.
  const llmProvider = azure.openAI ? "azure" : groqCfg ? "groq" : "none";

  return NextResponse.json({
    // Azure (preferred)
    azure: {
      openAI: azure.openAI,
      search: azure.search,
      fhir: azure.fhir,
      malaffi: azure.malaffi,
      mcp: azure.mcp
    },
    // Health Interoperability (Azure UAE North / Malaffi)
    healthInteroperability: {
      azureFhirEndpoint: fhirCfg?.endpoint ?? null,
      malaffiGateway: malaffiCfg?.gatewayUrl ?? null,
      facilityId: malaffiCfg?.facilityId ?? null,
      active: azure.fhir || azure.malaffi
    },
    // Free-tier fallback
    groq: {
      configured: groqCfg !== null,
      model: groqCfg?.model ?? null
    },
    // Which provider will be used for chat
    activeLLM: llmProvider,
    // Live model identity for transparency (model card, status pages)
    llm: {
      provider: llmProvider,
      model: azure.openAI ? azureCfg?.deployment ?? null : groqCfg?.model ?? null
    },
    // RAG source
    activeRAG: azure.search ? "azure-search" : "local-guidelines"
  });
}
