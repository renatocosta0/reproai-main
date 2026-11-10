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
  try {
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
  } catch (err) {
    console.error("[MCP loadMcpTools] failed to connect to MCP server:", err);
    return [];
  }
}

