# Generate code with your own AI

AI is optional. OpenScratch 0.6 can generate code through a user-configured **OpenAI-compatible Chat Completions endpoint**. The editor and local runtimes continue to work without an API key or AI connection. There are no OpenScratch AI quotas; your provider can charge for requests or impose limits.

## Configure and generate

1. Open **Preferences → Generate code with AI**, or find that action in the command palette.
2. Expand **Provider settings** if it is collapsed. Enter the API **base URL**, model ID and API key from your provider. For OpenAI, the base URL is `https://api.openai.com/v1`. The app appends `/chat/completions`; do not append it yourself. Choose a model that supports this endpoint and streaming.
3. For a local Ollama server, use `http://localhost:11434/v1` and an already installed model ID. A key is optional for local services. See [Ollama compatibility documentation](https://docs.ollama.com/api/openai-compatibility). OpenScratch does not download or start models.
4. Keys are session-only by default. Select **Remember key in system secure storage** to persist a new key encrypted by the OS. This option is disabled when secure storage is unavailable. **Remove saved key** removes the current endpoint's persisted/session key. Leaving the key field blank retains that endpoint's existing key. Changing endpoint never forwards a key saved for another endpoint.
5. Describe the code to generate. **Include current tab code** is off by default. Expand **Review what will be sent** to inspect the prompt, optional code, destination, model and language/runtime.
6. Click **Generate code**. This saves the entered configuration and starts the explicit request. **Save AI settings** alone never contacts the provider. Cancel or close the panel to stop an in-progress request.
7. Review the Monaco diff. **Accept and apply** replaces the original tab's code and disables Auto Run. It rejects a changed tab or stale original. **Discard proposal** leaves the tab untouched. Run the accepted code yourself when ready.

Red/deleted and green/added diff lines identify changes, with Monaco's line markers as well. Generation currently produces one complete replacement program, not an autonomous agent or a conversation history.

## Privacy and boundaries

Requests contain a short source-code-generation instruction, your prompt, language/runtime, and optionally current code. They exclude environment variables, working paths, other tabs, output and settings. Code or prompts can themselves contain secrets: review them before sending. The API key is an authorization header, not model context. Provider response bodies are not echoed in authentication/network errors.

Configuration is stored separately in versioned `ai.json`; credentials are encrypted separately or retained only in main-process memory. Keys are never returned by status IPC. The Node runtime has user-level filesystem permissions and is not a hostile-code sandbox; OS-backed encryption and bridge separation do not make arbitrary scripts safe to run under your account.

HTTPS is required except for loopback HTTP endpoints (`localhost`, `127.0.0.1`, `[::1]`). Embedded URL credentials, query-string tokens and redirects are rejected. This protects against accidentally forwarding credentials to a redirected host. Technical bounds: 120-second request timeout, 16,000-character prompt, 100,000-character optional code/generated code and 2 MB streamed transport. Partial, filtered or tool-call responses are not offered as completed proposals.

## Compatibility and current limits

The adapter implements `POST /chat/completions`, Bearer authentication, `stream: true`, and SSE `choices[].delta.content` with a completed `stop` finish reason. See the [official OpenAI streaming documentation](https://developers.openai.com/api/docs/guides/streaming-responses). Responses API, native Anthropic/Gemini protocols, custom authentication headers, model discovery, multi-turn chat, attachments and tool execution are not implemented. Use a compatible gateway for other protocols, or add an adapter below. Provider availability and model quality have not been verified with a paid account in this release.

Tests exercise the actual HTTP adapter against a disposable local protocol server and the full desktop review/apply flow, using test-only credentials and generated fixtures. They do not prove every service/model is compatible. No cloud credentials are bundled.

## Add a provider

`src/ai/contracts.ts` remains independent of execution: AIProvider, AIRequest/AIChunk, configuration, capabilities, typed AIError, AITransport, CredentialStorage and AIAdapterFactory. Implement `stream(request, { signal })` as an async iterable; forward AbortSignal through transport and stream reads and release readers in finally. Yield text while streaming and a proposal only after successful completion. Mock providers belong only in tests.

`src/ai/openai-compatible.ts` contains the live transport/adapter. `src/ai/controller.ts` is the main-process composition root, injecting the adapter through `composeAI`, retrieving endpoint-bound credentials, enforcing request IDs and batching renderer events. Add your adapter selection here without changing any execution engine. Keep any secret custom headers in CredentialStorage, not renderer configuration.

`src/renderer/AIPanel.tsx` owns configuration/context consent and the read-only diff. `src/ai/service.ts` provides the allowlisted context builder and stale-original acceptance guard. New explanation/fix/refactor actions can use the existing action contract, but currently only generation has a shipped UI/adapter capability. All new actions must remain explicit; accepted AI edits must never trigger execution.
