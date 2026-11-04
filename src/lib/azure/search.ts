// Retrieval-Augmented Generation grounding.
//
// Priority order (automatic):
//   1. Azure AI Search — full semantic/vector search when configured
//      Activated by: AZURE_SEARCH_ENDPOINT + AZURE_SEARCH_API_KEY + AZURE_SEARCH_INDEX
//   2. Local WHO/clinical guidelines — keyword-based fallback, always available
//
// When Azure AI Search credentials arrive, fill in AZURE_SEARCH_* in .env
// and this module will automatically use Azure without any code changes.

import { getAzureSearchConfig } from "@/lib/azure/config";
import { localSearch } from "@/lib/guidelines-local/who-fertility";

export interface SearchSnippet {
  content: string;
  source?: string;
}

export async function retrieveGrounding(query: string, top = 3): Promise<SearchSnippet[]> {
  const cfg = getAzureSearchConfig();

  // ── 1. Azure AI Search ───────────────────────────────────────────────────
  if (cfg) {
    const url = `${cfg.endpoint}/indexes/${encodeURIComponent(cfg.index)}/docs/search?api-version=2024-07-01`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "api-key": cfg.apiKey },
      body: JSON.stringify({ search: query, top, queryType: "simple" }),
      cache: "no-store"
    });
    if (!res.ok) {
      throw new Error(`Azure AI Search error (${res.status})`);
    }
    const data = (await res.json()) as { value?: Array<Record<string, unknown>> };
    return (data.value ?? []).map((doc) => ({
      content: String(doc.content ?? doc.chunk ?? ""),
      source: doc.source ? String(doc.source) : doc.title ? String(doc.title) : undefined
    }));
  }

  // ── 2. Local WHO guidelines (keyword fallback) ───────────────────────────
  return localSearch(query, top).map((s) => ({
    content: s.content,
    source: s.source
  }));
}
