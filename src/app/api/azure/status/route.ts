import { NextResponse } from "next/server";
import { azureStatus } from "@/lib/azure/config";
import { getGroqConfig } from "@/lib/groq/client";

// Reports which LLM/search capabilities are configured.
// Useful for a demo readiness check and for the UI to show provider status.
export async function GET() {
  const azure = azureStatus();
  return NextResponse.json({
    // Azure (preferred)
    azure: {
      openAI: azure.openAI,
      search: azure.search
    },
    // Free-tier fallback
    groq: {
      configured: getGroqConfig() !== null,
      model: getGroqConfig()?.model ?? null
    },
    // Which provider will be used for chat
    activeLLM: azure.openAI ? "azure" : getGroqConfig() ? "groq" : "none",
    // RAG source
    activeRAG: azure.search ? "azure-search" : "local-guidelines"
  });
}
