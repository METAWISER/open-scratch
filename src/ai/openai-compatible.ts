import {
  AIError,
  type AIProvider,
  type AIConfiguration,
  type AITransport,
  type CredentialStorage,
  type AIRequest,
  type AIChunk,
} from "./contracts";
import { aiSettingsSchema } from "./wire";
export const fetchTransport: AITransport = {
  async request(config, body, { signal, credential }) {
    const { endpoint } = aiSettingsSchema.parse(config);
    return fetch(endpoint.replace(/\/$/, "") + "/chat/completions", {
      method: "POST",
      redirect: "error",
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(credential ? { Authorization: `Bearer ${credential}` } : {}),
      },
      body: JSON.stringify(body),
    });
  },
};
export function extractCode(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```[^\n]*\n([\s\S]*?)\n```$/.exec(trimmed);
  return fenced ? fenced[1] : trimmed;
}
export class CompatibleProvider implements AIProvider {
  readonly id = "openai-compatible";
  readonly capabilities = {
    streaming: true,
    actions: ["generate"] as const,
    local: false,
  };
  constructor(
    private config: AIConfiguration,
    private transport: AITransport,
    private credentials: CredentialStorage,
  ) {}
  async *stream(
    request: AIRequest,
    { signal }: { signal: AbortSignal },
  ): AsyncIterable<AIChunk> {
    const key = this.config.credentialId
      ? await this.credentials.get(this.config.credentialId)
      : undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    try {
      const response = await this.transport.request(
        this.config,
        {
          model: this.config.model,
          stream: true,
          messages: [
            {
              role: "system",
              content:
                "Generate a complete replacement program in the requested language/runtime. Return only source code, without Markdown, explanations or tool calls. Do not request secrets.",
            },
            {
              role: "user",
              content: JSON.stringify({
                instruction: request.messages
                  .filter((m) => m.role === "user")
                  .map((m) => m.content)
                  .join("\n"),
                language: request.context.language,
                runtime: request.context.runtime,
                currentCode: request.context.code,
              }),
            },
          ],
        },
        { signal, credential: key },
      );
      if (!response.ok) {
        await response.body?.cancel();
        throw new AIError(
          response.status === 401 || response.status === 403
            ? "authentication"
            : response.status === 429
              ? "rate-limit"
              : "network",
          `Provider returned HTTP ${response.status}. Check endpoint, model and credentials.`,
          response.status >= 500,
        );
      }
      if (
        !response.body ||
        !response.headers.get("content-type")?.includes("text/event-stream")
      ) {
        await response.body?.cancel();
        throw new AIError(
          "invalid-response",
          "Expected a streaming Chat Completions response.",
        );
      }
      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let pending = "",
        text = "",
        bytes = 0,
        finished = false,
        done = false;
      while (!done) {
        signal.throwIfAborted();
        const chunk = await reader.read();
        if (chunk.done) break;
        bytes += chunk.value.byteLength;
        if (bytes > 2_000_000)
          throw new AIError(
            "invalid-response",
            "AI response exceeded the 2 MB transport limit.",
          );
        pending += decoder.decode(chunk.value, { stream: true });
        let boundary: RegExpExecArray | null;
        while ((boundary = /\r?\n\r?\n/.exec(pending))) {
          const event = pending.slice(0, boundary.index);
          pending = pending.slice(boundary.index + boundary[0].length);
          const data = event
            .split(/\r?\n/)
            .filter((l) => l.startsWith("data:"))
            .map((l) => l.slice(5).trimStart())
            .join("\n");
          if (!data) continue;
          if (data === "[DONE]") {
            done = true;
            break;
          }
          const value = JSON.parse(data);
          if (value.error)
            throw new AIError(
              "invalid-response",
              "Provider reported a stream error.",
            );
          const choice = value.choices?.[0];
          if (!choice) continue;
          if (
            choice.delta?.refusal ||
            choice.delta?.tool_calls ||
            choice.delta?.function_call
          )
            throw new AIError(
              "unsupported",
              "Provider returned a refusal or tool call instead of code.",
            );
          if (choice.finish_reason && choice.finish_reason !== "stop")
            throw new AIError(
              "invalid-response",
              "Generation was incomplete or filtered. No proposal was created.",
            );
          if (choice.finish_reason === "stop") finished = true;
          const delta = choice.delta?.content;
          if (delta != null && typeof delta !== "string")
            throw new AIError("invalid-response", "Invalid streamed content.");
          if (delta) {
            text += delta;
            if (text.length > 100000)
              throw new AIError(
                "invalid-response",
                "Generated code exceeded 100,000 characters.",
              );
            yield { type: "text", text: delta };
          }
        }
      }
      if (!finished || !text.trim())
        throw new AIError(
          "invalid-response",
          "Stream ended without a complete code response.",
        );
      yield {
        type: "proposal",
        original: request.context.code,
        replacement: extractCode(text),
      };
      yield { type: "done" };
    } catch (error) {
      if (signal.aborted)
        throw new AIError("cancelled", "Generation cancelled or timed out.");
      if (error instanceof AIError) throw error;
      throw new AIError(
        "network",
        "Unable to read the provider response. Check the endpoint and connection.",
        true,
      );
    } finally {
      await reader?.cancel().catch(() => {});
      reader?.releaseLock();
    }
  }
}
