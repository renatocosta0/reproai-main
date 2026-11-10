// Agent orchestrator: runs a tool-calling loop on top of Azure OpenAI (with
// automatic fallback to Groq when Azure credits/credentials are pending).
// The model may call built-in tools (ML prediction, guideline search) and any
// external MCP tools. All tool results are real outputs from those services.

import { chatRaw, ChatOptions, ChatResult } from "@/lib/azure/openai";
import { getAzureOpenAIConfig } from "@/lib/azure/config";
import { groqChatRaw, getGroqConfig } from "@/lib/groq/client";
import { Tool, AgentMessage, AgentResult } from "@/lib/agents/types";
import { builtinTools } from "@/lib/agents/tools";
import { loadMcpTools } from "@/lib/agents/mcp";

export type { AgentMessage, AgentResult };

const MAX_TURNS = 5;

// Unified tool-calling dispatcher: Azure OpenAI preferred, Groq automatic fallback
async function executeChatTurn(
  convo: unknown[],
  options: ChatOptions
): Promise<{ result: ChatResult; provider: "azure" | "groq" }> {
  if (getAzureOpenAIConfig()) {
    const result = await chatRaw(convo, options);
    return { result, provider: "azure" };
  }

  if (getGroqConfig()) {
    const result = await groqChatRaw(convo, options);
    return { result, provider: "groq" };
  }

  throw new Error("Neither Azure OpenAI nor Groq is configured for agent tool execution.");
}

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
  let activeProvider: "azure" | "groq" = "azure";

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    const { result, provider } = await executeChatTurn(convo, { tools: toolSpecs });
    activeProvider = provider;

    if (result.toolCalls.length === 0) {
      return { reply: result.content ?? "", toolsUsed, provider: activeProvider };
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
          if (!toolsUsed.includes(tool.name)) {
            toolsUsed.push(tool.name);
          }
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
  const { result: final, provider } = await executeChatTurn(convo, {});
  return { reply: final.content ?? "", toolsUsed, provider };
}

