export type AIAction = "explain" | "generate" | "fix" | "refactor";
export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}
export interface AIContext {
  language: "js" | "ts" | "jsx" | "tsx" | "py";
  runtime: "node" | "browser" | "python";
  code: string;
  selectedOutput?: string;
}
export interface AIConfiguration {
  adapter: "custom" | "openai-compatible" | "ollama";
  endpoint: string;
  model: string;
  credentialId?: string;
  headers?: Record<string, string>;
}
export interface AICapabilities {
  streaming: boolean;
  actions: readonly AIAction[];
  local: boolean;
}
export interface AIRequest {
  action: AIAction;
  messages: readonly AIMessage[];
  context: AIContext;
}
export type AIChunk =
  | { type: "text"; text: string }
  | { type: "proposal"; original: string; replacement: string }
  | { type: "done" };
export type AIErrorCode =
  | "cancelled"
  | "authentication"
  | "network"
  | "rate-limit"
  | "invalid-response"
  | "unsupported";
export class AIError extends Error {
  constructor(
    readonly code: AIErrorCode,
    message: string,
    readonly retryable = false,
  ) {
    super(message);
    this.name = "AIError";
  }
}
export interface AIProvider {
  readonly id: string;
  readonly capabilities: AICapabilities;
  stream(
    request: AIRequest,
    options: { signal: AbortSignal },
  ): AsyncIterable<AIChunk>;
}
export interface CredentialStorage {
  get(id: string): Promise<string | undefined>;
  set(id: string, value: string): Promise<void>;
  delete(id: string): Promise<void>;
}
export interface AITransport {
  request(
    config: AIConfiguration,
    body: unknown,
    options: { signal: AbortSignal; credential?: string },
  ): Promise<Response>;
}
export interface AIAdapterFactory {
  create(
    config: AIConfiguration,
    transport: AITransport,
    credentials: CredentialStorage,
  ): AIProvider;
}
