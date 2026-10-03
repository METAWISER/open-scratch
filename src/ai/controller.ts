import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { AIError, type CredentialStorage, type AITransport } from "./contracts";
import { SecureCredentials } from "./credentials";
import { CompatibleProvider, fetchTransport } from "./openai-compatible";
import { composeAI } from "./service";
import {
  aiSettingsSchema,
  generationSchema,
  type AISettings,
  type AIStatus,
  type AIEvent,
} from "./wire";
import type { SecretStorage } from "../main/store";
export class AIController {
  private settings: AISettings | null = null;
  private sessionKeys = new Map<string, string>();
  private credentials: CredentialStorage;
  private active?: { id: string; abort: AbortController };
  private ready: Promise<void>;
  private writes: Promise<unknown> = Promise.resolve();
  constructor(
    private root: string,
    private emit: (event: AIEvent) => void,
    private encryption?: SecretStorage,
    private transport: AITransport = fetchTransport,
  ) {
    this.credentials = new SecureCredentials(
      join(root, "ai-credentials"),
      encryption,
    );
    this.ready = this.load();
  }
  private async load() {
    try {
      const data = JSON.parse(
        await readFile(join(this.root, "ai.json"), "utf8"),
      );
      if (data.version === 1)
        this.settings = aiSettingsSchema.parse(data.settings);
    } catch {
      /* Missing or invalid nonsecret configuration leaves AI unconfigured. */
    }
  }
  private keyId(settings: AISettings) {
    return createHash("sha256")
      .update(settings.endpoint.replace(/\/$/, ""))
      .digest("hex");
  }
  async status(): Promise<AIStatus> {
    await this.ready;
    const id = this.settings ? this.keyId(this.settings) : undefined;
    return {
      settings: this.settings,
      secureStorage: !!this.encryption,
      hasKey:
        !!id &&
        !!(this.sessionKeys.get(id) || (await this.credentials.get(id))),
    };
  }
  configure(raw: unknown, rawKey: unknown, rawRemember: unknown) {
    const operation = this.writes
      .catch(() => {})
      .then(async () => {
        await this.ready;
        this.cancel();
        const settings = aiSettingsSchema.parse(raw);
        const key = z
          .string()
          .max(8192)
          .refine((k) => !/[\r\n]/.test(k))
          .optional()
          .parse(rawKey);
        const remember = z.boolean().parse(rawRemember ?? false);
        const id = this.keyId(settings);
        if (key) {
          if (remember) await this.credentials.set(id, key);
          else await this.credentials.delete(id);
          this.sessionKeys.set(id, key);
        }
        await mkdir(this.root, { recursive: true });
        await writeFile(
          join(this.root, "ai.json.tmp"),
          JSON.stringify({ version: 1, settings }),
          { mode: 0o600 },
        );
        await rename(
          join(this.root, "ai.json.tmp"),
          join(this.root, "ai.json"),
        );
        this.settings = settings;
        return this.status();
      });
    this.writes = operation;
    return operation;
  }
  async forget() {
    await this.writes.catch(() => {});
    await this.ready;
    this.cancel();
    if (this.settings) {
      const id = this.keyId(this.settings);
      this.sessionKeys.delete(id);
      await this.credentials.delete(id);
    }
    return this.status();
  }
  cancel(id?: string) {
    if (!id || id === this.active?.id) this.active?.abort.abort();
  }
  async generate(raw: unknown) {
    const request = generationSchema.parse(raw);
    this.cancel();
    const active = { id: request.id, abort: new AbortController() };
    this.active = active;
    await this.writes.catch(() => {});
    await this.ready;
    if (active.abort.signal.aborted) {
      if (this.active === active) {
        this.active = undefined;
        this.emit({
          id: request.id,
          type: "error",
          code: "cancelled",
          message: "Generation cancelled or timed out.",
        });
      }
      return;
    }
    if (!this.settings) {
      this.active = undefined;
      throw new Error("Configure an AI provider first.");
    }
    const signal = AbortSignal.any([
      active.abort.signal,
      AbortSignal.timeout(120000),
    ]);
    const id = this.keyId(this.settings);
    const credentials: CredentialStorage = {
      get: async (k) =>
        this.sessionKeys.get(k) ?? (await this.credentials.get(k)),
      set: (k, v) => this.credentials.set(k, v),
      delete: (k) => this.credentials.delete(k),
    };
    const service = composeAI(
      new CompatibleProvider(
        { ...this.settings, adapter: "openai-compatible", credentialId: id },
        this.transport,
        credentials,
      ),
    );
    let buffered = "";
    const flush = () => {
      if (buffered && this.active === active && !signal.aborted)
        this.emit({ id: request.id, type: "text", text: buffered });
      buffered = "";
    };
    const timer = setInterval(flush, 50);
    try {
      for await (const chunk of service.invoke(
        {
          action: "generate",
          context: request.context,
          messages: [{ role: "user", content: request.prompt }],
        },
        signal,
      )) {
        if (this.active !== active) return;
        if (chunk.type === "text") buffered += chunk.text;
        if (chunk.type === "proposal") {
          flush();
          this.emit({ id: request.id, type: "done", code: chunk.replacement });
        }
      }
    } catch (error) {
      if (this.active === active)
        this.emit({
          id: request.id,
          type: "error",
          code: signal.aborted
            ? "cancelled"
            : error instanceof AIError
              ? error.code
              : "network",
          message: signal.aborted
            ? "Generation cancelled or timed out."
            : error instanceof AIError
              ? error.message
              : "AI request failed. Check configuration.",
        });
    } finally {
      clearInterval(timer);
      if (this.active === active) this.active = undefined;
    }
  }
}
