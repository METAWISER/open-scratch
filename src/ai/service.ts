import type { AIProvider, AIRequest, AIChunk, AIContext } from "./contracts";
import type { Tab } from "../shared/contracts";
/** Explicit allowlist: environment, cwd and application settings never enter context. */
export function buildContext(tab: Tab, selectedOutput?: string): AIContext {
  return {
    code: tab.code,
    language: tab.language,
    runtime: tab.runtime,
    ...(selectedOutput ? { selectedOutput } : {}),
  };
}
export class AIService {
  constructor(private readonly provider?: AIProvider) {}
  get available() {
    return !!this.provider;
  }
  async *invoke(
    request: AIRequest,
    signal: AbortSignal,
  ): AsyncIterable<AIChunk> {
    if (!this.provider) throw new Error("No AI provider configured");
    signal.throwIfAborted();
    if (!this.provider.capabilities.actions.includes(request.action))
      throw new Error("Unsupported AI action");
    for await (const chunk of this.provider.stream(request, { signal })) {
      signal.throwIfAborted();
      yield chunk;
    }
  }
}
/** The composition root injects a provider. There is intentionally no execution dependency. */
export function composeAI(provider?: AIProvider) {
  return new AIService(provider);
}
export interface CodeProposal {
  original: string;
  replacement: string;
}
export function acceptProposal(
  current: string,
  proposal: CodeProposal,
  accepted: boolean,
): string {
  if (!accepted) return current;
  if (current !== proposal.original)
    throw new Error("Code changed after proposal; review a new diff");
  return proposal.replacement;
}
