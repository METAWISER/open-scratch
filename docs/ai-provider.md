# AI provider extension

The application works without AI. No chat or live provider is configured in 0.1. No background transmission exists. Mock behavior exists only in tests.

`src/ai/contracts.ts` defines messages, context, endpoint/model/authentication reference configuration, capabilities, typed errors, transport, credential storage, adapter factories and `AIProvider`. Custom services, OpenAI-compatible endpoints and Ollama can each implement `AIAdapterFactory`; their wire protocols intentionally stay outside the execution engine. Real transport adapters and chat UI are future work.

Implement `stream(request, { signal })` as an async iterable yielding text, proposals and completion. Forward the signal to fetch and stream reads; release readers in finally. Normalize failures to AIError codes. Never place credentials in context or logs. Retrieve credentials using a credentialId through CredentialStorage, not a renderer-supplied secret. SecureCredentials rejects persistence when OS encryption is unavailable.

```ts
import type { AIProvider } from '../src/ai/contracts';
import { composeAI, buildContext } from '../src/ai/service';

const service = composeAI(myProvider); // composition root, no runtime changes
const abort = new AbortController();
// Only execute this after the user explicitly invokes an AI action.
for await (const chunk of service.invoke({
  action: 'explain', messages: [{ role: 'user', content: 'Explain this code' }],
  context: buildContext(selectedTab),
}, abort.signal)) {
  // Render text; render proposals as a diff. Do not execute a proposal.
}
abort.abort();
```

Context uses an allowlist: code, language, runtime, and optional explicitly selected output. Environment, cwd and settings are excluded. Selected output might contain secrets deliberately logged by the user, so future UI must show the exact outbound context for review. Endpoint/model are nonsecret configuration; tokens belong in OS-backed storage. Custom authentication headers must also be stored securely when they contain credentials.

`acceptProposal` requires acceptance and rejects stale originals. A future UI must display an actual diff before calling it, then update the editor without triggering execution. Auto Run must be suppressed for accepted AI edits until the user explicitly runs them. No quotas are imposed here; external providers may charge or restrict usage independently.

Tests prove injection, streaming, cancellation, context exclusion and proposal acceptance; they make no network requests.
