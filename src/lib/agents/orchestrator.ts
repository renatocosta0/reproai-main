// Agent orchestrator: runs a tool-calling loop on top of Azure OpenAI. The model
// may call built-in tools (ML prediction, guideline search) and any external MCP
// tools. All tool results are real outputs from those services. When Azure is not
// configured the underlying client throws AzureNotConfigured and the caller
// returns an honest 503.

import { chatRaw } from "@/lib/azure/openai";
import { Tool, AgentMessage, AgentResult } from "@/lib/agents/types";
import { builtinTools } from "@/lib/agents/tools";
import { loadMcpTools } from "@/lib/agents/mcp";

export type { AgentMessage, AgentResult };

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

