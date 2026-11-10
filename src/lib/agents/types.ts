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

export interface AgentMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AgentResult {
  reply: string;
  toolsUsed: string[];
  provider?: "azure" | "groq";
}

