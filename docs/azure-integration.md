# Azure integration (AI Foundry / Azure OpenAI + AI Search)

ReproAI is prepared for the Microsoft Azure resources offered by the Future Health
Digital Innovation Challenge. The integration is **configuration-driven**: it stays
disabled until Azure credentials are provided, and never mocks responses.

## Capabilities

| Capability | Azure service | Code |
|---|---|---|
| Conversational assistant | Azure AI Foundry / Azure OpenAI | `src/lib/azure/openai.ts` |
| RAG grounding on guidelines | Azure AI Search | `src/lib/azure/search.ts` |
| Responsible-AI system prompt | n/a | `src/lib/azure/prompt.ts` |
| Config + readiness | n/a | `src/lib/azure/config.ts`, `GET /api/azure/status` |

## Enabling it once credits arrive

1. Create an Azure OpenAI (Foundry) resource and deploy a chat model (e.g. `gpt-4o`).
2. Set `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, and either
   `AZURE_OPENAI_API_KEY` or use Entra ID (pass a bearer token to `chatCompletion`).
3. (Optional, for RAG) Create an Azure AI Search index of WHO/clinical guideline
   documents and set `AZURE_SEARCH_ENDPOINT`, `AZURE_SEARCH_API_KEY`, `AZURE_SEARCH_INDEX`.
4. Verify with `GET /api/azure/status` — both flags should be `true`.

## Responsible AI

The system prompt (`prompt.ts`) enforces a non-diagnostic, empathetic, stigma-reducing
tone, requires citing grounding context, and forbids fabricating clinical facts. This
maps directly to the challenge's Responsible AI & safety criterion. Aligns with
Microsoft guidance: "Implement a Responsible Generative AI Solution in Microsoft Foundry".

## Mapping to Microsoft learning resources

- **Azure OpenAI model selection & evaluation** — deployment name configurable via env.
- **RAG & grounding in Azure AI Search** — `search.ts` retrieval layer.
- **Responsible AI** — `prompt.ts` guardrails.
- **Agents / MCP / multi-agent** — future extension points on top of this client layer.
