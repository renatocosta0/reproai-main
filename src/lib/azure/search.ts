// Back-compat wrapper. Retrieval now lives in src/lib/rag/retrieve.ts (cited
// corpus, BM25, abstention; Azure AI Search when AZURE_SEARCH_* is set).

import { retrieve } from "@/lib/rag/retrieve";
import { citationLabel } from "@/lib/rag/corpus";

export interface SearchSnippet {
  content: string;
  source?: string;
}

export async function retrieveGrounding(query: string, top = 3): Promise<SearchSnippet[]> {
  const r = await retrieve(query, { top, audience: "clinician", scope: "clinical" });
  return r.hits.map((h) => ({ content: h.passage.text, source: `${h.passage.id} · ${citationLabel(h.passage)}` }));
}
