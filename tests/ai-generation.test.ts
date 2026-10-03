import { describe, it, expect } from "vitest";
import { createServer } from "node:http";
import { mkdtemp, readFile, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AIController } from "../src/ai/controller";
import { CompatibleProvider } from "../src/ai/openai-compatible";
import { aiSettingsSchema, type AIEvent } from "../src/ai/wire";
import { SecureCredentials } from "../src/ai/credentials";
const request = () => ({
  id: crypto.randomUUID(),
  prompt: "Generate a greeting",
  context: {
    language: "ts" as const,
    runtime: "node" as const,
    code: "// context",
  },
});
const sse = (text: string, reason = "stop") =>
  `data: ${JSON.stringify({ choices: [{ delta: { content: text }, finish_reason: null }] })}\r\n\r\ndata: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: reason }] })}\r\n\r\ndata: [DONE]\r\n\r\n`;
describe("AI generation transport and credentials", () => {
  it("sends an explicitly allowlisted request and auth over real HTTP, streams code and persists no session secret", async () => {
    const dir = await mkdtemp(join(tmpdir(), "openscratch-ai-"));
    let received = "",
      auth = "",
      path = "";
    const server = createServer(async (req, res) => {
      auth = req.headers.authorization ?? "";
      path = req.url ?? "";
      for await (const chunk of req) received += chunk;
      res.writeHead(200, { "content-type": "text/event-stream" });
      const bytes = Buffer.from(sse('```ts\nconsole.log("héllo");\n```'));
      for (let i = 0; i < bytes.length; i += 7)
        res.write(bytes.subarray(i, i + 7));
      res.end();
    });
    await new Promise<void>((resolve) =>
      server.listen(0, "127.0.0.1", resolve),
    );
    const port = (server.address() as { port: number }).port;
    const events: AIEvent[] = [];
    try {
      const controller = new AIController(dir, (e) => events.push(e));
      const settings = {
        endpoint: `http://127.0.0.1:${port}/v1`,
        model: "test-model",
      };
      await controller.configure(settings, "TEST_ONLY_KEY", false);
      expect(events).toEqual([]);
      expect(received).toBe("");
      await controller.generate({
        ...request(),
        context: {
          ...request().context,
          env: { SECRET: "never-send" },
          cwd: "/private",
        },
      });
      expect(path).toBe("/v1/chat/completions");
      expect(auth).toBe("Bearer TEST_ONLY_KEY");
      expect(received).not.toMatch(/never-send|private|TEST_ONLY_KEY/);
      expect(events.at(-1)).toMatchObject({
        type: "done",
        code: 'console.log("héllo");',
      });
      expect(await readFile(join(dir, "ai.json"), "utf8")).not.toContain(
        "TEST_ONLY_KEY",
      );
      expect((await new AIController(dir, () => {}).status()).hasKey).toBe(
        false,
      );
      await controller.configure(
        { ...settings, endpoint: `http://127.0.0.1:${port}/other` },
        undefined,
        false,
      );
      expect((await controller.status()).hasKey).toBe(false);
      await controller.configure(settings, undefined, false);
      await controller.forget();
      expect((await controller.status()).hasKey).toBe(false);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("cancels a waiting stream and never creates a proposal", async () => {
    const dir = await mkdtemp(join(tmpdir(), "openscratch-ai-"));
    const events: AIEvent[] = [];
    let started!: () => void;
    const ready = new Promise<void>((r) => (started = r));
    const controller = new AIController(dir, (e) => events.push(e), undefined, {
      request: async (_c, _b, { signal }) => {
        started();
        return new Promise((_resolve, reject) =>
          signal.addEventListener("abort", () => reject(signal.reason), {
            once: true,
          }),
        );
      },
    });
    try {
      await controller.configure(
        { endpoint: "https://example.com/v1", model: "test" },
        undefined,
        false,
      );
      const r = request();
      const running = controller.generate(r);
      await ready;
      controller.cancel(r.id);
      await running;
      expect(events.at(-1)).toMatchObject({ type: "error", code: "cancelled" });
      expect(events.some((e) => e.type === "done")).toBe(false);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("rejects unsafe endpoints and refuses plaintext credential persistence", async () => {
    for (const endpoint of [
      "http://example.com/v1",
      "https://user:pass@example.com/v1",
      "https://example.com/v1?key=secret",
      "file:///tmp/ai",
    ])
      expect(() => aiSettingsSchema.parse({ endpoint, model: "x" })).toThrow();
    const dir = await mkdtemp(join(tmpdir(), "openscratch-ai-"));
    try {
      await expect(
        new SecureCredentials(dir).set("key", "secret"),
      ).rejects.toThrow("refusing plaintext");
      expect(await readdir(dir)).toEqual([]);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it("rejects truncated, oversized, non-streaming and unauthorized responses without leaking bodies", async () => {
    for (const response of [
      new Response(sse("incomplete", "length"), {
        headers: { "content-type": "text/event-stream" },
      }),
      new Response(sse("x".repeat(100001)), {
        headers: { "content-type": "text/event-stream" },
      }),
      new Response("secret-provider-body", { status: 401 }),
      new Response("not-sse"),
    ]) {
      const provider = new CompatibleProvider(
        {
          adapter: "openai-compatible",
          endpoint: "https://example.com/v1",
          model: "x",
        },
        { request: async () => response },
        {
          get: async () => undefined,
          set: async () => {},
          delete: async () => {},
        },
      );
      const proposals = [];
      try {
        for await (const chunk of provider.stream(
          {
            action: "generate",
            messages: [{ role: "user", content: "go" }],
            context: request().context,
          },
          { signal: new AbortController().signal },
        ))
          if (chunk.type === "proposal") proposals.push(chunk);
        throw new Error("Unexpected success");
      } catch (error) {
        expect(String(error)).not.toContain("secret-provider-body");
        expect(String(error)).not.toContain("Unexpected success");
      }
      expect(proposals).toEqual([]);
    }
  });
});

it("decodes fragmented UTF-8 and SSE boundaries and suppresses replaced requests", async () => {
  const encoder = new TextEncoder();
  const data = encoder.encode(sse('console.log("🌈");'));
  const provider = new CompatibleProvider(
    {
      adapter: "openai-compatible",
      endpoint: "https://example.com/v1",
      model: "x",
    },
    {
      request: async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              for (const byte of data) controller.enqueue(Uint8Array.of(byte));
              controller.close();
            },
          }),
          { headers: { "content-type": "text/event-stream" } },
        ),
    },
    { get: async () => undefined, set: async () => {}, delete: async () => {} },
  );
  const chunks = [];
  for await (const chunk of provider.stream(
    { action: "generate", messages: [], context: request().context },
    { signal: new AbortController().signal },
  ))
    chunks.push(chunk);
  expect(chunks.find((c) => c.type === "proposal")).toMatchObject({
    replacement: 'console.log("🌈");',
  });
  const dir = await mkdtemp(join(tmpdir(), "openscratch-ai-"));
  const events: AIEvent[] = [];
  const controller = new AIController(dir, (e) => events.push(e), undefined, {
    request: async () =>
      new Response(sse("42"), {
        headers: { "content-type": "text/event-stream" },
      }),
  });
  try {
    await controller.configure(
      { endpoint: "https://example.com/v1", model: "x" },
      undefined,
      false,
    );
    const first = request(),
      second = request();
    await Promise.all([
      controller.generate(first),
      controller.generate(second),
    ]);
    expect(events.some((e) => e.id === first.id && e.type === "done")).toBe(
      false,
    );
    expect(events.at(-1)).toMatchObject({
      id: second.id,
      type: "done",
      code: "42",
    });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
