Analyzed route.ts:L1-25
Analyzed route.ts:L1-5

Aqui está a **especificação técnica completa do backend** (arquitetura, regras de negócio, modelos de dados e documentação exata de todos os endpoints), formatada como um guia de integração pronto para ser entregue a um desenvolvedor ou designer frontend:

---

# 📋 ReproAI — Especificação de Backend e Guia de Integração para Frontend

## 1. Visão Geral da Arquitetura

* **Framework de API:** Next.js 14 (Route Handlers em `/api/*`).
* **Banco de Dados:** PostgreSQL (hospedado no Neon) gerenciado via **Prisma ORM**.
* **Autenticação:** Baseada em sessão via **Cookie HTTP-Only seguro** assinado com JWT (`reproai_session`).
* **Controle de Acesso (RBAC):** Dois papéis de usuário:
  * `PATIENT`: Acesso restrito aos dados do seu próprio casal/parceria.
  * `CLINICIAN`: Acesso de triagem e visualização da coorte global de casais/pacientes e gestão de alertas.
* **Serviço de Machine Learning:** Microsserviço Python (FastAPI/Scikit-Learn) que calcula a probabilidade de gravidez/sucesso em FIV e a importância dos fatores clínicos.
* **Assistente de IA com RAG:** Integração híbrida com Azure OpenAI (GPT-4o) ou Groq (Llama-3), alimentada por busca semântica em diretrizes clínicas da OMS e ESHRE.

---

## 2. Modelos de Dados Principais (Entidades Prisma)

Para desenhar o estado e os formulários, estas são as entidades persistidas:

* **`User`**: `id`, `email`, `role` (`"PATIENT"` | `"CLINICIAN"`), `coupleId`, `consentAt` (DateTime).
* **`Couple`**: `id`, `createdAt`, relacionamentos com `User[]`, `Patient[]`, `Observation[]`, `Prediction[]`, `FollowUp[]`.
* **`Patient`**: Dados clínicos individuais dos membros do casal:
  * `id`, `coupleId`, `name`, `sex` (`"female"` | `"male"`), `age` (Int), `bmi` (Float), `amh` (Float), `spermCount` (Float), `pcosHistory` (Boolean), `infertilityDurationMonths` (Int), `priorCycles` (Int).
* **`Observation`**: Registros temporais de biomarcadores/wearables (padrão HL7 FHIR):
  * `id`, `coupleId`, `code` (ex: `"body-temperature"`, `"sleep-hours"`), `value` (Float), `unit` (String), `effectiveAt` (DateTime).
* **`Prediction`**: Incorrência preditiva gerada pelo modelo de ML:
  * `id`, `coupleId`, `probability` (Float 0-100), `confidenceLow` (Float), `confidenceHigh` (Float), `factors` (JSON String com importâncias), `modelVersion`, `createdAt`.
* **`FollowUp`**: Gestão clínica de suporte a casais de risco:
  * `id`, `coupleId`, `status` (`"ALERT_RAISED"` | `"APPOINTMENT_SCHEDULED"` | `"IN_FOLLOW_UP"` | `"CLOSED"` | `"LOST"`), `note`, `updatedAt`, `createdAt`.
* **`AuditLog`**: Registro de governança (leitura/escrita de prontuários sensíveis).

---

## 3. Mapeamento Completo de Endpoints

### 🔐 A. Autenticação e Sessão

#### `POST /api/auth/register`
* **Objetivo:** Criar nova conta. Se o papel for `PATIENT`, o backend cria automaticamente uma entidade `Couple` vinculada ao usuário.
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!",
    "role": "PATIENT" // ou "CLINICIAN"
  }
  ```
* **Response (201 Created):**
  ```json
  {
    "ok": true,
    "role": "PATIENT"
  }
  ```
* **Cookie:** Define automaticamente o cookie de sessão `reproai_session`.

#### `POST /api/auth/login`
* **Objetivo:** Autenticar usuário existente.
* **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "Password123!"
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "ok": true,
    "role": "PATIENT" // ou "CLINICIAN"
  }
  ```

#### `GET /api/auth/session`
* **Objetivo:** Consultar a sessão atual no carregamento da página / troca de rota.
* **Headers:** Envia o cookie automaticamente.
* **Response (200 OK):**
  ```json
  {
    "session": {
      "userId": "cuid_xxx",
      "role": "PATIENT",
      "coupleId": "cuid_couple_xxx"
    }
  }
  ```
* **Response (401 Unauthorized):** `{ "session": null }`

#### `POST /api/auth/logout`
* **Objetivo:** Destruir o cookie de sessão.
* **Response (200 OK):** `{ "ok": true }`

---

### 📋 B. Onboarding e Consentimento

#### `POST /api/consent`
* **Objetivo:** Registrar o consentimento informado e cadastrar/atualizar os nomes dos dois parceiros do casal.
* **Request Body:**
  ```json
  {
    "femaleName": "Maya A.",
    "maleName": "Omar A."
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "ok": true,
    "consentAt": "2026-11-08T10:00:00.000Z"
  }
  ```

---

### 🧬 C. Inteligência Artificial e Predição (ML Core)

#### `POST /api/predict`
* **Objetivo:** Enviar os biomarcadores do casal para inferência em tempo real. Se o usuário estiver autenticado como `PATIENT`, o backend salva automaticamente a predição no banco e atualiza o histórico do casal.
* **Regra de Negócio Especial:** Se `probability < 25%`, o backend **cria automaticamente um alerta clínico de follow-up** (`ALERT_RAISED`) para triagem médica.
* **Request Body:**
  ```json
  {
    "age": 34,
    "bmi": 24.5,
    "amh": 1.8,
    "sperm_count": 14.5,
    "pcos_history": false,
    "infertility_duration_months": 24,
    "prior_cycles": 1,
    "female_name": "Maya A.", // opcional
    "male_name": "Omar A."    // opcional
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "probability": 38.4,
    "confidence_low": 32.1,
    "confidence_high": 44.7,
    "model_version": "v1.0.0",
    "factors": [
      { "feature": "Female age", "impact": 0.35 },
      { "feature": "AMH (ovarian reserve)", "impact": 0.25 },
      { "feature": "Sperm concentration", "impact": 0.20 },
      { "feature": "Infertility duration", "impact": 0.12 }
    ]
  }
  ```

---

### ⌚ D. Observações e Wearables (FHIR-Aligned)

#### `GET /api/observations?coupleId={coupleId}`
* **Objetivo:** Obter histórico recente de leituras de wearables/observações (temperatura basal, sono, etc.). Retorna até as 20 mais recentes ordenadas por data.
* **Response (200 OK):**
  ```json
  {
    "observations": [
      {
        "id": "cuid_obs_1",
        "coupleId": "cuid_couple_xxx",
        "code": "body-temperature",
        "value": 36.8,
        "unit": "celsius",
        "effectiveAt": "2026-11-08T07:30:00.000Z"
      }
    ]
  }
  ```

#### `POST /api/observations`
* **Objetivo:** Adicionar nova leitura manual ou de dispositivo.
* **Request Body:**
  ```json
  {
    "coupleId": "cuid_couple_xxx",
    "code": "body-temperature", // ou "sleep-hours", etc.
    "value": 36.9,
    "unit": "celsius"
  }
  ```
* **Response (201 Created):** Objeto `observation` criado.

---

### 🏥 E. Pacientes e Casais (Área do Clínico)

#### `GET /api/patients`
* **Objetivo:** Listar todos os perfis de pacientes cadastrados na plataforma.
* **Response (200 OK):**
  ```json
  {
    "patients": [
      {
        "id": "patient-1",
        "coupleId": "couple-1",
        "name": "Maya A.",
        "sex": "female",
        "age": 38,
        "bmi": 27.5,
        "amh": 0.9,
        "spermCount": null,
        "pcosHistory": true,
        "infertilityDurationMonths": 36,
        "priorCycles": 2,
        "createdAt": "2026-11-04T00:00:00.000Z"
      }
    ]
  }
  ```

#### `POST /api/patients`
* **Objetivo:** Cadastrar manualmente um registro de paciente associado a um `coupleId`.
* **Request Body:** Dados clínicos do paciente + `coupleId`.

---

### 🔄 F. Gestão de Acompanhamento (Closed-Loop Follow-Up)

#### `GET /api/follow-up`
* **Objetivo:** Listar todos os casos sob acompanhamento clínico (triagem de risco).
* **Response (200 OK):**
  ```json
  {
    "items": [
      {
        "id": "cuid_fup_1",
        "coupleId": "a3f9c2",
        "status": "ALERT_RAISED",
        "note": "Low-response probability detected (18.7%). Multidisciplinary case review suggested.",
        "updatedAt": "2026-11-08T08:00:00.000Z",
        "createdAt": "2026-11-08T08:00:00.000Z"
      }
    ]
  }
  ```

#### `POST /api/follow-up`
* **Objetivo:** Criar um caso de acompanhamento manual para um casal.
* **Request Body:** `{ "coupleId": "cuid_couple_xxx" }`

#### `PATCH /api/follow-up`
* **Objetivo:** Atualizar o status de acompanhamento ou adicionar notas médicas.
* **Request Body:**
  ```json
  {
    "id": "cuid_fup_1",
    "status": "APPOINTMENT_SCHEDULED", // ALERT_RAISED | APPOINTMENT_SCHEDULED | IN_FOLLOW_UP | CLOSED | LOST
    "note": "Consulta multidisciplinar agendada para 12/11."
  }
  ```
* **Response (200 OK):** Objeto `item` atualizado.

---

### 💬 G. Assistente Conversacional Clínico (Chat com IA)

#### `POST /api/assistant`
* **Objetivo:** Chat interativo de orientação em fertilidade grounded em diretrizes da OMS.
* **Request Body:**
  ```json
  {
    "messages": [
      { "role": "user", "content": "O que significa meu valor de AMH estar em 0.9?" }
    ]
  }
  ```
* **Response (200 OK):**
  ```json
  {
    "reply": "O hormônio antimülleriano (AMH) reflete a reserva ovariana...",
    "provider": "azure", // ou "groq"
    "sources": ["WHO Guidelines on Infertility (2023)"]
  }
  ```
* **Response (503 Service Unavailable):** Se nenhuma chave de IA estiver ativa.

---

### 📄 H. Relatórios Médicos e Exportação Interoperável

#### `GET /api/reports/:id`
* **Objetivo:** Gerar e baixar em tempo real o **Relatório Clínico em PDF** oficial do casal (onde `:id` é o `coupleId`).
* **Regras:**
  * Retorna erro `404` se o casal não existir.
  * Retorna erro `409` se o casal ainda não tiver realizado nenhuma predição.
* **Response Headers:**
  * `Content-Type: application/pdf`
  * `Content-Disposition: attachment; filename="reproai-report-{id}.pdf"`
* **Conteúdo do PDF:** Identificação do casal, score de predição com margem de confiança, quebra de fatores e protocolos sugeridos pelo guideline.

#### `GET /api/fhir/export?coupleId={id}&code={code}`
* **Objetivo:** Exportar os dados em padrão internacional de saúde **HL7 FHIR R4 Bundle**.
* **Response (200 OK):**
  ```json
  {
    "resourceType": "Bundle",
    "type": "collection",
    "entry": [
      {
        "resource": {
          "resourceType": "Observation",
          "id": "obs-1",
          "status": "final",
          "code": { "text": "body-temperature" },
          "subject": { "reference": "Patient/a3f9c2" },
          "effectiveDateTime": "2026-11-08T07:30:00.000Z",
          "valueQuantity": { "value": 36.8, "unit": "celsius" }
        }
      }
    ]
  }
  ```

---

### ⚙️ I. Status de Infraestrutura e Health Checks

#### `GET /api/azure/status`
* **Objetivo:** Indicador para o frontend saber quais serviços de IA estão ativos.
* **Response (200 OK):**
  ```json
  {
    "azure": { "openAI": true, "search": false },
    "groq": { "configured": true, "model": "llama-3.1-8b-instant" },
    "activeLLM": "azure",
    "activeRAG": "local-guidelines"
  }
  ```

#### `GET /api/health`
* **Objetivo:** Endpoint simples de ping/uptime. Retorna `{ "status": "ok" }`.

---

## 4. Resumo de Requisitos de UX/Fluxo para o Desenvolvedor Frontend

1. **Dois Portais Distintos com Base no `role` do Usuário:**
   * **Portal do Paciente (`PATIENT`):**
     * Onboarding com termo de consentimento (`POST /api/consent`).
     * Calculadora de predição interativa com visualização dos fatores de risco (`POST /api/predict`).
     * Registro de temperatura/sono e acompanhamento de ciclo (`/api/observations`).
     * Download do laudo em PDF (`/api/reports/:id`).
     * Assistente virtual de dúvidas (`POST /api/assistant`).
   * **Portal do Médico (`CLINICIAN`):**
     * Dashboard de coorte com lista de casais e estratificação de risco.
     * Painel de acompanhamento (Kanban ou tabela de status) com ações rápidas para mudar status de alerta (`PATCH /api/follow-up`).
     * Métricas de impacto econômico (custo médio evitado por ciclo de FIV não responsivo).
     * Botão de exportação padrão FHIR R4 para integração com prontuários eletrônicos.
     .
     Esta é a pergunta de ouro do seu projeto. A sua intuição está absolutamente correta: se replicar a arquitetura exata do ThinkMD (focado em saúde pública, offline no terreno e sem acesso direto do paciente) para o ReproAI, o projeto perde o foco, torna-se desnecessariamente complexo e perde o seu maior valor comercial — a jornada do paciente em fertilidade.
Não, o modelo puro do ThinkMD não é o melhor caminho para o ReproAI. No entanto, o modelo tradicional de uma app de fertilidade comum também não vence o desafio da Microsoft e do MBZUAI.
O caminho vencedor para o ReproAI é um modelo híbrido B2B2C (Business-to-Business-to-Consumer). Abaixo, analiso o porquê e como estruturar isto de forma enxuta para o seu MVP.

⚖️ Análise de Ajuste de Mercado (ReproAI vs. ThinkMD)


Dimensão	O Modelo ThinkMD (Geral/População)	O Cenário Real do ReproAI (Fertilidade)
Quem usa a App?	Apenas o agente de saúde. O paciente não tem ecrã.	O Casal (Paciente) monitoriza em casa e o Médico acompanha na clínica.
Ambiente de Rede	Offline total (selva, zonas rurais sem internet).	Online/Conectado (uso de wearables em casa, dados sincronizados na nuvem).
Tipo de Decisão	Triagem imediata de vida ou morte (Pneumonia, Cólera).	Análise Longitudinal (evolução de biomarcadores, sono, temperatura ao longo de meses).


🚀 O Caminho Ideal para o ReproAI: O Modelo B2B2C Enxuto

Para o ReproAI, em vez de criar um "escritório com dezenas de níveis de enfermeiros", o seu SaaS deve ser desenhado como uma Plataforma de Prescrição Digital e Acompanhamento Remoto de Fertilidade.
O fluxo ideal e realista para o seu MVP funciona assim:

1. A Clínica de Fertilidade compra o SaaS (B2B)

A clínica médica quer aumentar a taxa de sucesso dos tratamentos de fertilização (FIV) ou inseminação. Ela assina o ReproAI para os seus médicos terem um painel de controlo centralizado.

2. O Médico "Prescreve" o Acesso ao Casal (B2C)

O paciente não cria conta sozinho na internet para se autodiagnosticar (isso mantém o rigor clínico). O médico, no seu ecrã, clica em "Convidar Novo Casal" e introduz o e-mail deles.

3. O Casal usa a App em Casa (O Diferencial do ReproAI)

O casal recebe o convite, descarrega a app do ReproAI e passa a introduzir os seus dados diariamente:
• Alimenta os dados de wearables (temperatura basal, qualidade do sono).
• Utiliza o Chat IA para tirar dúvidas sobre o tratamento de forma contínua.
• O motor de IA calcula a probabilidade de sucesso (/api/predict).

4. O Loop de Retorno (O Alerta Automático)

Se a IA detetar que os biomarcadores do casal caíram drasticamente (ex: anomalias no sono, temperatura inadequada na janela de ovulação ou exames hormonais com probabilidade < 25%), o sistema não assusta o paciente. Ele dispara um alerta automático no ecrã do médico (PATCH /api/follow-up). O médico liga para o casal e antecipa a consulta.

🛠️ O que isto muda no seu MVP até 20 de Novembro?

Isto torna o seu desenvolvimento muito mais simples e focado do que o ecossistema do ThinkMD:
1. Elimine o Modo Offline Complexo: O seu público (casais em tratamento de fertilidade) está em áreas urbanas ou com acesso à internet para sincronizar wearables. Pode usar chamadas à API normais (Next.js), sem precisar de configurar sincronizações complexas em lote offline no Service Worker.
2. Mantenha os Dois Perfis Simplificados: O seu backend atual com a rota GET /api/auth/session que devolve o role (Paciente ou Médico) e o coupleId é exatamente o que precisa. Não invente perfis de "enfermeiro", "assistente de triagem", etc.
3. Foque na Experiência do Casal: Para o júri do Future Health Challenge, o grande trunfo do ReproAI será mostrar como a IA traduz dados complexos de wearables e exames de fertilidade numa interface simples para o casal, mantendo o médico no controlo do tratamento através de alertas em tempo real.
Faz sentido esta abordagem mais direcionada para o mercado de fertilidade? Se concordar com este modelo híbrido, prefere que foquemos no design/código do Ecrã do Casal (introdução de dados e chat com IA) ou no Painel do Médico (onde ele vê a lista de casais e os alertas de risco)?
.
Com a transição para o modelo híbrido B2B2C, o foco do ReproAI muda da sobrevivência numa selva sem internet (como o ThinkMD) para a excelência na jornada clínica de fertilidade e monitorização contínua.
Muitas daquelas sugestões continuam a ser válidas, mas são reconfiguradas para serem muito mais leves e focadas para o ecossistema de fertilidade.
O que se mantém, o que cai e como adaptar para o seu MVP:

1. Reavaliação dos Endpoints


🔄 Módulo: Sincronização e Resiliência (Offline-First)

• O que muda: 🔴 Cai a complexidade do Offline-First total. Os casais usam a app em ambientes domésticos ou urbanos com conectividade estável. Não precisa de um Service Worker complexo a processar dados localmente.
• O que se mantém adaptado: 🟢 A rota POST /api/sync/batch passa a chamar-se POST /api/observations/bulk. Os wearables (como anéis inteligentes ou pulseiras) acumulam dados históricos de sono e temperatura. O frontend deve enviar estes dados acumulados em lote para evitar dezenas de chamadas individuais à API.

🫁 Módulo: Triagem e Lógica Bayesian Avançada

• O que muda: 🔵 Mantém-se a 100% e ganha mais força. O júri da Microsoft e do MBZUAI valoriza fluxos autónomos.
• Como fica: A rota POST /api/predict/dynamic-step passa a ser o motor de Onboarding Clínico do casal. Em vez de assustar o casal com um formulário de 30 campos logo no início, a IA recolhe os dados por etapas (Etapa 1: Idade e IMC; Etapa 2: Resultados do Espermograma; Etapa 3: Histórico de SOP). Se na Etapa 1 a idade combinada for muito avançada e o tempo de infertilidade for > 4 anos, a API executa o Short-Circuit lógico, alterando as perguntas seguintes para focar logo em tratamentos de alta complexidade (FIV) em vez de indução de ovulação natural.

📊 Módulo: Vigilância Populacional e Alertas de Saúde (Early Warning)

• O que muda: 🟡 Adapta-se ao nicho de fertilidade. Em vez de caçar surtos de cólera, foca-se em surtos de falhas de ciclo ou anomalias reprodutivas regionais.
• Como fica: A rota GET /api/public-health/anomalies mantém-se apenas para o perfil do Médico/Administrador da clínica. O algoritmo agrupa dados demográficos anonimizados. Se num determinado bairro ou faixa etária de pacientes houver um pico repentino de falhas de implantação ou taxas de AMH drasticamente baixas, o sistema alerta o médico. Isto pode indicar fatores ambientais, picos de stress locais ou problemas de saúde pública ocultos na região.

2. Tabela de Evolução Atualizada (Foco B2B2C)


Funcionalidade	Estado Atual do ReproAI	O que se Mantém para o Vencedor	Ação Concreta para o MVP (Next.js 14)
Persistência de Rede	Chamadas individuais à API REST por medição.	Envio em Lote de Wearables.	Criar a rota de inserção múltipla do Prisma (createMany) para descarregar o histórico do wearable de uma só vez.
Lógica de IA	Chamada direta via chat ou rota única estática /api/predict.	Formulários Dinâmicos e Triagem Guiada.	Dividir o /api/predict em passos modulares. Usar lógica booleana simples para triagem inicial e delegar predições complexas ao Azure/OpenRouter. [1] (https://mail.google.com/mail/?extsrc=sync&client=h&plid=ACUX6DMq3ks07nH5tkvHTVwCFQtyvaRG4KAGp-E)
Interoperabilidade	Exportação FHIR R4 estática por casal (/api/fhir/export).	Exportação Hospitalar Complacente.	Manter a exportação HL7 FHIR. É o que valida o ReproAI para ser vendido a grandes laboratórios e hospitais.
Governança de Dados	Cookies de sessão normais.	Auditoria de Eventos Clínicos.	Adicionar logs de auditoria no Postgres sempre que o estado de um alerta clínico mudar de ALERT_RAISED para IN_FOLLOW_UP.

Para avançarmos com foco total no prazo de 20 de novembro, o que prefere estruturar agora: [1] (https://mail.google.com/mail/?extsrc=sync&client=h&plid=ACUX6DPSQsqApvdmdOd9cxtIHc_4YUklOcGDZL4)
• O código de backend da rota de Onboarding dinâmico por etapas (/api/predict/dynamic-step)?
• O design técnico do mecanismo de envio em lote de dados de wearables (/api/observations/bulk)?
.
Commit and push to branch feat/phase-6-azure-agents-mcp in repository ReproAi. The commit contains 9 file changes.
feat(agents): phase 6 Azure AI agent orchestration + MCP tool integration

Adds an agentic layer on top of the Azure OpenAI client: tool-calling chat,
a tool registry (fertility prediction + guideline grounding), an MCP client
adapter to surface external MCP tools, and an agent orchestrator with a tool
loop. Everything is configuration-driven; no responses or tool results are
mocked. Falls back to honest errors when Azure/MCP is unconfigured.
.
--- .env.example
+++ .env.example
@@ -1,5 +1,10 @@
 # Optional: Retrieval-Augmented Generation via Azure AI Search (grounding on
 # WHO/clinical guidelines). Leave blank to disable RAG; the assistant still works.
 AZURE_SEARCH_ENDPOINT=""            # e.g. https://<search>.search.windows.net
 AZURE_SEARCH_API_KEY=""
-AZURE_SEARCH_INDEX=""               # index containing guideline documents
+AZURE_SEARCH_INDEX=""               # index containing guideline documents
+
+# Optional: external MCP (Model Context Protocol) server exposing extra tools to
+# the agent. Leave blank to use only built-in tools. Streamable HTTP transport.
+MCP_SERVER_URL=""                   # e.g. https://<host>/mcp
+MCP_SERVER_TOKEN=""                 # optional bearer token for the MCP server
.
--- src/lib/azure/config.ts
+++ src/lib/azure/config.ts
@@ -1,6 +1,18 @@
+export interface McpConfig {
+  url: string;
+  token?: string;
+}
+
+export function getMcpConfig(): McpConfig | null {
+  const url = process.env.MCP_SERVER_URL;
+  if (!url) return null;
+  return { url: url.replace(/\/$/, ""), token: process.env.MCP_SERVER_TOKEN || undefined };
+}
+
 export function azureStatus() {
   return {
     openAI: getAzureOpenAIConfig() !== null,
-    search: getAzureSearchConfig() !== null
+    search: getAzureSearchConfig() !== null,
+    mcp: getMcpConfig() !== null
   };
 }
.
// Shared types for the ReproAI agent layer. A Tool is an OpenAI/Foundry
// function-tool definition plus a handler that performs the real work. Handlers
// must return real results only; they never fabricate data.

export interface JsonSchema {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: JsonSchema;
}

export interface Tool extends ToolDefinition {
  handler: (args: Record<string, unknown>) => Promise<unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: string; // JSON string from the model
}
.
--- src/lib/azure/openai.ts
+++ src/lib/azure/openai.ts
@@ -1,49 +1,86 @@
 export interface ChatOptions {
   temperature?: number;
   maxTokens?: number;
   entraToken?: string; // optional Entra ID bearer token when no API key is used
+  tools?: Array<{ type: "function"; function: Record<string, unknown> }>;
 }
 
-export async function chatCompletion(
-  messages: ChatMessage[],
-  options: ChatOptions = {}
-): Promise<string> {
-  const cfg = getAzureOpenAIConfig();
-  if (!cfg) throw new AzureNotConfigured();
+// Raw tool call as returned by the model.
+export interface RawToolCall {
+  id: string;
+  type: "function";
+  function: { name: string; arguments: string };
+}
 
-  const url = `${cfg.endpoint}/openai/deployments/${encodeURIComponent(
-    cfg.deployment
-  )}/chat/completions?api-version=${cfg.apiVersion}`;
+export interface ChatResult {
+  content: string | null;
+  toolCalls: RawToolCall[];
+  raw: unknown;
+}
 
+function buildHeaders(cfg: NonNullable<ReturnType<typeof getAzureOpenAIConfig>>, options: ChatOptions): Record<string, string> {
   const headers: Record<string, string> = { "Content-Type": "application/json" };
   if (cfg.apiKey) {
     headers["api-key"] = cfg.apiKey;
   } else if (options.entraToken) {
     headers["Authorization"] = `Bearer ${options.entraToken}`;
   } else {
     throw new AzureNotConfigured();
   }
+  return headers;
+}
 
+// Low-level chat call that preserves tool calls. Accepts raw message objects so
+// the agent loop can append assistant/tool messages between turns.
+export async function chatRaw(
+  messages: unknown[],
+  options: ChatOptions = {}
+): Promise<ChatResult> {
+  const cfg = getAzureOpenAIConfig();
+  if (!cfg) throw new AzureNotConfigured();
+
+  const url = `${cfg.endpoint}/openai/deployments/${encodeURIComponent(
+    cfg.deployment
+  )}/chat/completions?api-version=${cfg.apiVersion}`;
+
+  const body: Record<string, unknown> = {
+    messages,
+    temperature: options.temperature ?? 0.3,
+    max_tokens: options.maxTokens ?? 600
+  };
+  if (options.tools && options.tools.length > 0) {
+    body.tools = options.tools;
+    body.tool_choice = "auto";
+  }
+
   const res = await fetch(url, {
     method: "POST",
-    headers,
-    body: JSON.stringify({
-      messages,
-      temperature: options.temperature ?? 0.3,
-      max_tokens: options.maxTokens ?? 600
-    }),
+    headers: buildHeaders(cfg, options),
+    body: JSON.stringify(body),
     cache: "no-store"
   });
 
   if (!res.ok) {
     const detail = await res.text();
     throw new Error(`Azure OpenAI error (${res.status}): ${detail}`);
   }
 
   const data = (await res.json()) as {
-    choices?: Array<{ message?: { content?: string } }>;
+    choices?: Array<{ message?: { content?: string; tool_calls?: RawToolCall[] } }>;
   };
-  const content = data.choices?.[0]?.message?.content;
-  if (!content) throw new Error("Azure OpenAI returned an empty response");
-  return content;
+  const message = data.choices?.[0]?.message;
+  return {
+    content: message?.content ?? null,
+    toolCalls: message?.tool_calls ?? [],
+    raw: message ?? null
+  };
+}
+
+export async function chatCompletion(
+  messages: ChatMessage[],
+  options: ChatOptions = {}
+): Promise<string> {
+  const result = await chatRaw(messages as unknown[], options);
+  if (!result.content) throw new Error("Azure OpenAI returned an empty response");
+  return result.content;
 }
.
// Minimal MCP (Model Context Protocol) client adapter over streamable HTTP.
// Lists tools from an external MCP server and invokes them, surfacing them to
// the agent. Returns no tools when MCP is not configured; results are always the
// server's real responses (never mocked).

import { getMcpConfig } from "@/lib/azure/config";
import { Tool, JsonSchema } from "@/lib/agents/types";

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code: number; message: string };
}

async function rpc<T>(method: string, params: unknown): Promise<T> {
  const cfg = getMcpConfig();
  if (!cfg) throw new Error("MCP is not configured");
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream"
  };
  if (cfg.token) headers["Authorization"] = `Bearer ${cfg.token}`;

  const res = await fetch(cfg.url, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: Date.now(), method, params }),
    cache: "no-store"
  });
  if (!res.ok) throw new Error(`MCP server error (${res.status})`);
  const data = (await res.json()) as JsonRpcResponse<T>;
  if (data.error) throw new Error(`MCP error: ${data.error.message}`);
  return data.result as T;
}

interface McpToolSpec {
  name: string;
  description?: string;
  inputSchema?: JsonSchema;
}

// Discover MCP tools and wrap each as an agent Tool whose handler calls the
// server. Returns [] when MCP is not configured.
export async function loadMcpTools(): Promise<Tool[]> {
  if (!getMcpConfig()) return [];
  const { tools } = await rpc<{ tools: McpToolSpec[] }>("tools/list", {});
  return (tools ?? []).map((spec) => ({
    name: spec.name,
    description: spec.description ?? spec.name,
    parameters: spec.inputSchema ?? { type: "object", properties: {} },
    handler: async (args: Record<string, unknown>) => {
      const result = await rpc<unknown>("tools/call", { name: spec.name, arguments: args });
      return result;
    }
  }));
}
.
// Built-in agent tools. Each handler performs real work against the project's
// own services (the ML prediction API and Azure AI Search grounding). No tool
// returns fabricated data; when a backing service is unavailable the handler
// surfaces an honest error object.

import { Tool } from "@/lib/agents/types";
import { predict } from "@/lib/ml-client";
import { retrieveGrounding } from "@/lib/azure/search";

const predictFertility: Tool = {
  name: "predict_fertility_success",
  description:
    "Estimate the probability of fertility treatment success from clinical inputs using the ReproAI model.",
  parameters: {
    type: "object",
    properties: {
      age: { type: "number", description: "Female age in years" },
      bmi: { type: "number" },
      sperm_count: { type: "number", description: "Sperm concentration (million/mL)" },
      amh: { type: "number", description: "Anti-Mullerian hormone (ng/mL)" },
      pcos_history: { type: "boolean" },
      infertility_duration_months: { type: "number" },
      prior_cycles: { type: "number" }
    },
    required: [
      "age",
      "bmi",
      "sperm_count",
      "amh",
      "pcos_history",
      "infertility_duration_months",
      "prior_cycles"
    ]
  },
  handler: async (args) => {
    return predict({
      age: Number(args.age),
      bmi: Number(args.bmi),
      sperm_count: Number(args.sperm_count),
      amh: Number(args.amh),
      pcos_history: Boolean(args.pcos_history),
      infertility_duration_months: Number(args.infertility_duration_months),
      prior_cycles: Number(args.prior_cycles)
    });
  }
};

const searchGuidelines: Tool = {
  name: "search_guidelines",
  description:
    "Retrieve WHO/clinical guideline snippets relevant to a query from the Azure AI Search index.",
  parameters: {
    type: "object",
    properties: {
      query: { type: "string", description: "What to look up in the guidelines" }
    },
    required: ["query"]
  },
  handler: async (args) => {
    const snippets = await retrieveGrounding(String(args.query));
    return { snippets };
  }
};

export const builtinTools: Tool[] = [predictFertility, searchGuidelines];
.
// Agent orchestrator: runs a tool-calling loop on top of Azure OpenAI. The model
// may call built-in tools (ML prediction, guideline search) and any external MCP
// tools. All tool results are real outputs from those services. When Azure is not
// configured the underlying client throws AzureNotConfigured and the caller
// returns an honest 503.

import { chatRaw } from "@/lib/azure/openai";
import { Tool } from "@/lib/agents/types";
import { builtinTools } from "@/lib/agents/tools";
import { loadMcpTools } from "@/lib/agents/mcp";

export interface AgentMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AgentResult {
  reply: string;
  toolsUsed: string[];
}

const MAX_TURNS = 5;

export async function runAgent(messages: AgentMessage[]): Promise<AgentResult> {
  // Combine built-in tools with any configured MCP tools.
  const mcpTools = await loadMcpTools();
  const tools: Tool[] = [...builtinTools, ...mcpTools];
  const byName = new Map(tools.map((t) => [t.name, t]));

  const toolSpecs = tools.map((t) => ({
    type: "function" as const,
    function: { name: t.name, description: t.description, parameters: t.parameters }
  }));

  const convo: unknown[] = [...messages];
  const toolsUsed: string[] = [];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const result = await chatRaw(convo, { tools: toolSpecs });

    if (result.toolCalls.length === 0) {
      return { reply: result.content ?? "", toolsUsed };
    }

    // Append the assistant message that requested the tools.
    convo.push(result.raw);

    // Execute each requested tool with real handlers.
    for (const call of result.toolCalls) {
      const tool = byName.get(call.function.name);
      let output: unknown;
      if (!tool) {
        output = { error: `Unknown tool: ${call.function.name}` };
      } else {
        try {
          const args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
          output = await tool.handler(args);
          toolsUsed.push(tool.name);
        } catch (e) {
          output = { error: e instanceof Error ? e.message : "Tool execution failed" };
        }
      }
      convo.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(output)
      });
    }
  }

  // Final turn without tools to force a natural-language answer.
  const final = await chatRaw(convo, {});
  return { reply: final.content ?? "", toolsUsed };
}
.
import { NextRequest, NextResponse } from "next/server";
import { runAgent, AgentMessage } from "@/lib/agents/orchestrator";
import { buildGroundedSystemPrompt } from "@/lib/azure/prompt";
import { AzureNotConfigured } from "@/lib/azure/openai";
import { getSession } from "@/lib/auth";
import { audit } from "@/lib/audit";

// Agentic assistant endpoint. Runs the Azure-backed agent with built-in and MCP
// tools. Never fabricates answers: returns 503 when Azure is not configured.
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { messages } = (await req.json()) as { messages: AgentMessage[] };
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: "messages are required" }, { status: 400 });
  }

  const system: AgentMessage = { role: "system", content: buildGroundedSystemPrompt([]) };

  try {
    const { reply, toolsUsed } = await runAgent([system, ...messages]);
    await audit(session.userId, "agent_message", `user:${session.userId}`);
    return NextResponse.json({ reply, toolsUsed });
  } catch (e) {
    if (e instanceof AzureNotConfigured) {
      return NextResponse.json(
        {
          error:
            "The agent is not configured yet. Add Azure OpenAI credentials to enable it."
        },
        { status: 503 }
      );
    }
    const message = e instanceof Error ? e.message : "Agent error";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
.
--- docs/azure-integration.md
+++ docs/azure-integration.md
@@ -1,6 +1,26 @@
+## Agent layer (AI Agents + MCP)
+
+On top of the chat client, ReproAI has an agentic layer:
+
+| Capability | Code |
+|---|---|
+| Tool-calling chat | `src/lib/azure/openai.ts` (`chatRaw`) |
+| Built-in tools (ML prediction, guideline search) | `src/lib/agents/tools.ts` |
+| External MCP tool discovery/invocation | `src/lib/agents/mcp.ts` |
+| Agent orchestrator (tool loop) | `src/lib/agents/orchestrator.ts` |
+| Agent endpoint | `POST /api/agent` |
+
+The agent calls real tools: the `predict_fertility_success` tool invokes the
+ReproAI ML service and `search_guidelines` queries Azure AI Search. Any tools
+exposed by a configured MCP server (`MCP_SERVER_URL`) are discovered via
+`tools/list` and invoked via `tools/call` — real results only.
+
 ## Mapping to Microsoft learning resources
 
 - **Azure OpenAI model selection & evaluation** — deployment name configurable via env.
 - **RAG & grounding in Azure AI Search** — `search.ts` retrieval layer.
 - **Responsible AI** — `prompt.ts` guardrails.
-- **Agents / MCP / multi-agent** — future extension points on top of this client layer.
+- **AI Agents fundamentals / Foundry Agent Service** — `agents/orchestrator.ts` tool loop.
+- **MCP & tool integration** — `agents/mcp.ts` adapter.
+- **Multi-agent orchestration** — extension point: register additional specialised
+  agents as tools in the orchestrator.
.
Não, deve evitar incluir um chat tradicional e troca genérica de documentos, pois isso transforma o ReproAI num CRM clínico comum e dispersa o foco do seu MVP.
Para o Future Health Digital Innovation Challenge 2026, o júri (Microsoft e MBZUAI) procura inteligência clínica automatizada e análise preditiva, não ferramentas de comunicação que o WhatsApp ou sistemas hospitalares já resolvem.

Chat Médico vs. Chat IA Especializado
• Por que evitar o chat humano (Casal ↔ Médico): Criar um chat em tempo real exige infraestrutura de WebSockets, gestão de notificações, histórico de mensagens não lidas e gera um passivo médico-legal (o paciente espera resposta imediata de um médico). Isso foge ao escopo de inovação em IA.
• O que manter (A solução vencedora): Mantenha apenas o Chat com a IA (POST /api/assistant) para o casal tirar dúvidas 24/7 com base nas diretrizes da OMS. Para a comunicação com o médico, substitua o chat por Ações Estruturadas de Triagem (ex: o médico clica num botão "Solicitar Consulta Presencial" ou "Ajustar Protocolo" no painel dele, e o casal recebe uma notificação clara no ecrã).

Troca de Documentos PDF
• O que evitar (Upload genérico): Construir um gestor de ficheiros onde médico e paciente trocam receitas, recibos e PDFs aleatórios é funcionalidade de software administrativo de clínica, não de inteligência em fertilidade.
• O que manter (Geração e Extração Inteligente):
    • Saída (Médico/Sistema → Casal): Mantenha a rota que já tem (GET /api/reports/:id), onde o próprio sistema gera automaticamente o Laudo Clínico em PDF com os gráficos de probabilidade e biomarcadores.
    • Entrada (Casal → IA): Em vez de um repositório de PDFs, se quiser impressionar o júri, permita apenas um Leitor Inteligente de Exames (o casal faz upload do PDF do hemograma/AMH, a IA extrai os valores numéricos automaticamente para preencher o /api/predict, e descarta o ficheiro). Se não der tempo até 20 de novembro, mantenha apenas a inserção manual.

📊 Resumo de Escopo para o MVP (Foco Total)

Funcionalidade    Decisão    Motivo Estratégico para o Concurso
Chat Casal ↔ Médico    Remover    Complexidade alta de engenharia e baixo valor de inovação em IA.
Chat Casal ↔ IA (OMS)    Manter    Demonstra uso prático de LLMs com fontes médicas validadas.
Gestor de Ficheiros PDF    Remover    Característica de ERP hospitalar genérico; foge ao nicho de fertilidade.
Geração de Laudo PDF    Manter    Já está pronto no backend e entrega valor clínico imediato e tangível.

Ao cortar o chat humano e a troca de ficheiros, poupa dias preciosos de desenvolvimento até ao prazo de 20 de novembro e mantém o ReproAI 100% focado no seu diferencial: predição de fertilidade, monitorização via wearables e alerta precoce.
Sim, oferecer o motor do ReproAI como uma API B2B (API-as-a-Product) para outros softwares clínicos é uma excelente estratégia comercial e técnica.
Para grandes hospitais e clínicas de fertilidade que já usam prontuários eletrónicos (EMRs) próprios, integrar uma inteligência externa é muito mais rápido do que adotar uma nova plataforma visual do zero. Isso coloca o seu projeto no mesmo patamar de interoperabilidade do vencedor ThinkMD (que expõe APIs no padrão FHIR).
Como Funciona o Modelo "ReproAI Engine API"
Em vez de obrigar o médico a abrir o site do ReproAI, o software que a clínica já usa (ex: Tasy, Philips, ou sistemas locais) envia os dados clínicos silenciosamente para o seu servidor e exibe o resultado dentro da própria tela do hospital.

Autenticação por API Key: Você cria uma tabela ApiKey vinculada ao clinicId no seu banco de dados. O software parceiro envia a chave no cabeçalho da requisição (Authorization: Bearer sk_reproai_...).
Endpoints Expostos para Parceiros:
POST /api/v1/external/predict — O software da clínica envia idade, IMC, AMH e espermograma em JSON e recebe a probabilidade de sucesso, a faixa de confiança e os fatores de risco.
POST /api/v1/external/fhir/evaluate — O software hospitalar envia um pacote padrão HL7 FHIR R4 (como um recurso Patient e Observation) e o ReproAI devolve um recurso RiskAssessment padronizado.
Modelo de Monetização (SaaS + Consumo): Além da assinatura mensal das clínicas que usam a sua interface, você passa a cobrar por chamada de API (pay-per-prediction) de grandes redes hospitalares e laboratórios de análises clínicas.
Vantagens Estratégicas para o Concurso (GITEX 2026)
Apresentar esta visão de plataforma híbrida (App B2B2C + API B2B) ao júri da Microsoft e de Abu Dhabi demonstra maturidade de negócio:

Escalabilidade Global: Mostra que o ReproAI pode escalar para milhares de clínicas no Médio Oriente e em África sem depender do treinamento manual de médicos numa nova interface.
Aproveitamento do Código Atual: Como o seu backend em Next.js já possui a lógica do /api/predict e o suporte ao padrão HL7 FHIR, transformar isso numa API externa exige apenas a criação de um middleware simples de validação de chaves (x-api-key) e controle de limite de requisições (rate limiting).
O que Fazer no MVP até 20 de Novembro?
Para não atrasar o seu cronograma, não construa um portal complexo para desenvolvedores agora. Basta:

Adicionar um campo apiKey na tabela Clinic do seu schema Prisma.
Criar uma documentação simples (ex: uma página estática ou Swagger/OpenAPI básico) mostrando o exemplo de requisição curl para o endpoint /api/predict usando essa chave.
Mencionar no seu pitch e no documento de submissão que o ReproAI funciona tanto como plataforma completa (B2B2C) quanto como motor de IA plug-and-play via API (B2B) para prontuários eletrónicos existentes.
.
Male Reproductive Health
The Challenge
How can we identify and address male reproductive health risks earlier, reduce barriers to assessment, and connect men to appropriate care before infertility is diagnosed?
The Challenge
Male reproductive health is too often treated as a late-stage infertility issue rather than a routine part of preventive and preconception care. Men may enter the pathway only after prolonged difficulty conceiving or after the female partner has undergone assessment. This delays identification of modifiable, metabolic, infectious, anatomical or semen-related risk factors and can narrow the available choices for the individual and couple. Abu Dhabi’s reproductive health direction is to move upstream: awareness and prevention across life stages, earlier risk detection, integrated digital and genomic-enabled care, and a more connected patient journey. Population Health Intelligence design work also recognizes that male and female infertility require distinct risk models and pathways. The remaining gap is a trusted, low friction front door for men one that reduces stigma and inconvenience, protects highly sensitive information, and translates risk signals into appropriate clinical action. The solution must be designed around religious, social, and cultural sensitivities.
Objective
Help men understand and act on reproductive health risks earlier, make assessment easier and more private to access, and guide them to the right care.
Your solution should

1Earlier, explainable risk identification. Use, where possible, consented history, lifestyle, metabolic, infectious, anatomical and available test inputs to identify relevant risk signals before infertility is diagnosed, while clearly distinguishing screening from diagnosis.
2A culturally trusted experience. Provide discreet and understandable communication that reflects religious, social and cultural sensitivities; avoiding stigma and assumptions about family choices.
3Lower-friction assessment. Remove a material access barrier through options such as private digital intake, teleconsultation, and at-home steps where clinically appropriate, clear service navigation or reduced unnecessary visits.
4Safe triage and referral. Direct users to an appropriate next step: self-care information, primary care, andrology/urology, fertility services or urgent assessment, with red flags, clinical boundaries and human oversight made explicit.
5Privacy by design. Use explicit consent, data minimization, user-controlled sharing, strong access controls, and a clear explanation of how reproductive data will and will not be used.
6Demonstrable value. Show performance on realistic or simulated cases and report measures such as completed assessments, time to appropriate evaluation, referral completion, user trust and fairness across relevant population groups. Fertility · Challenge 02 Reproductive Potential The Challenge How can we help individuals and health systems identify changes in reproductive potential earlier and translate them into timely, evidence informed and personalized choices? The Challenge Reproductive potential changes across the life course, but most people receive a meaningful assessment only when they are actively trying to conceive or are already experiencing difficulty. Relevant information is dispersed across personal and family history, lifestyle and metabolic risks, reproductive conditions, laboratory results and, where available, longitudinal or device data. Without a coherent view, individuals can overestimate or underestimate risk, while clinicians and the health system lack a simple way to identify who may benefit from earlier counselling or assessment. Abu Dhabi’s strategy calls for awareness and prevention across life stages, predictive and preventive care, and an integrated health and genomics data foundation. Current solutions implemented such as screening programs, and the wider wellness ecosystem provide an opportunity to connect screening, Health Age, patient healthcare apps, and reproductive-health pathways. The challenge is not to provide a deterministic “fertility score”; it is to create an evidence-led, understandable view of change over time that supports informed choices without creating anxiety, discrimination or false certainty. Objective Give individuals and clinicians an earlier, clearer view of changes in reproductive potential, and turn that view into personalized, evidence-informed choices. Your solution should
1A longitudinal view of reproductive potential. Combine only the inputs a user is authorized and willing to share, such as age, history, lifestyle, relevant conditions, laboratory or hormone results and device data, to show direction of change rather than a one-off label.
2Plain-language interpretation. Explain which factors are modifiable, which are not, what evidence supports the assessment and where missing data or uncertainty limits the result.
3Timely, personalized options. Translate findings into appropriate choices such as health optimization, testing, preconception counselling, fertility-preservation discussion or specialist referral, without prescribing beyond the solution’s intended use.
4Clinician and system usefulness. Provide a concise clinician view and population-level insight that can identify groups who may benefit from earlier advice, while keeping individual clinical decisions with qualified professionals.
5Privacy, non-discrimination, and user control. Make consent granular and revocable; prevent use of reproductive information for employment, insurance or other unrelated decisions; and preserve confidentiality across the pathway.
6Evidence of earlier action. Demonstrate how the solution improves time from risk signal to counselling or assessment, informed-choice quality, referral completion and equitable reach, with calibration and false-reassurance risks reported. 1. [Fertility] Reproductive Potential (Foco Principal) Por que esta é a área exata do ReproAI:
Predição do Potencial Reprodutivo: O núcleo de Machine Learning do ReproAI foi desenvolvido especificamente para calcular a probabilidade de concepção e taxa de sucesso em tratamentos de fertilidade/FIV (com margem de confiança e explicabilidade de biomarcadores como AMH/reserva ovariana, idade, IMC, histórico de SOP e tempo de infertilidade).
Diretrizes e Protocolos: Recomenda protocolos de estimulação e condutas clínicas com base na resposta reprodutiva prevista para o casal. 🥈 2. [Fertility] Male Reproductive Health (Forte Diferencial Integrado) Embora a categoria principal seja o Potencial Reprodutivo, o ReproAI tem uma sobreposição direta com Male Reproductive Health:
A plataforma foi desenhada sob a tese de que a fertilidade é uma jornada do casal (couple's journey), integrando ativamente o homem na avaliação.
O modelo preditivo inclui parâmetros seminais reais (spermCount / concentração espermática) para combater o estigma clínico de focar apenas no fator feminino.
Dica para o pitch/inscrição: Se a plataforma permitir selecionar uma área primária e uma secundária, esta é a sua escolha secundária perfeita. Novos dados para melhorar o prompt, analisa e veja como esses dados poderão ser importantes, e Att: No prompt, coloca que tem atualizar o projeto para apagar toda implementação sem nenhuma fonte que as sustenta, o projeto deve ser livre de ASSUMPTIONS, podendo sim ter LIMITATIONS
.
Okay, mas uma correção, a fase 6, ela ainda não foi implementada, eu tinha mandado para voce analisar e verificar a implementação dela, a unica coisa que tinha sido implementada nos 4 blocos que mandei era o 1 bloco, A plataforma permite selecionar apenas 1 categoria, e vou selecionar [Fertility] Reproductive Potential, outra coisa tambem, de momento não vou fazer testes ainda, refazer o fazer o prompt tendo isso em conta