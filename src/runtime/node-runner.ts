import { fork, type ChildProcess } from "node:child_process";
import { terminateTree } from "./process-tree";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import type { RunRequest, RunEvent } from "../shared/contracts";
import { compile } from "../compiler/compile";
import { validEvent } from "../shared/wire";
export function executionEnv(
  overrides: Record<string, string>,
): NodeJS.ProcessEnv {
  const result: NodeJS.ProcessEnv = {};
  for (const key of [
    "SystemRoot",
    "WINDIR",
    "TEMP",
    "TMP",
    "PATH",
    "HOME",
    "USERPROFILE",
    "LANG",
  ])
    if (process.env[key]) result[key] = process.env[key];
  // No application/cloud credentials or NODE_OPTIONS inherited.
  return { ...result, ...overrides, ELECTRON_RUN_AS_NODE: "1" };
}
export class NodeRunner {
  private child?: ChildProcess;
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private runId?: string;
  constructor(
    private workspace: string,
    private worker: string,
    private emit: (event: RunEvent) => void,
  ) {}
  async stop() {
    this.generation++;
    clearTimeout(this.timer);
    const child = this.child;
    this.child = undefined;
    const runId = this.runId;
    this.runId = undefined;
    await terminateTree(child);
    if (runId) this.emit({ kind: "status", runId, status: "stopped" });
  }
  async run(request: RunRequest) {
    const stopped = this.stop();
    const generation = this.generation;
    await stopped;
    if (generation !== this.generation) return;
    this.runId = request.runId;
    this.emit({ kind: "status", runId: request.runId, status: "running" });
    const directory = join(this.workspace, ".runs", request.runId);
    await mkdir(directory, { recursive: true });
    try {
      const code = await compile(request, this.workspace);
      if (generation !== this.generation) {
        await rm(directory, { recursive: true, force: true });
        return;
      }
      const file = join(directory, "scratch.mjs");
      await writeFile(file, code);
      const child = fork(this.worker, [], {
        cwd: request.tab.cwd || this.workspace,
        env: executionEnv(request.tab.env),
        execArgv: [
          "--enable-source-maps",
          `--max-old-space-size=${request.limits.memory}`,
        ],
        stdio: ["ignore", "pipe", "pipe", "ipc"],
        detached: process.platform !== "win32",
        windowsHide: true,
      });
      this.child = child;
      let rawCount = 0;
      const raw = (data: Buffer) => {
        if (generation === this.generation && rawCount++ < 10)
          this.emit({
            kind: "output",
            runId: request.runId,
            level: "warn",
            values: [
              { type: "string", preview: data.toString().slice(0, 8000) },
            ],
          });
      };
      child.stdout?.on("data", raw);
      child.stderr?.on("data", raw);
      let accepted = 0;
      let bytes = 0;
      let failed = false;
      child.on("message", (event: unknown) => {
        if (
          generation !== this.generation ||
          !validEvent(event) ||
          event.runId !== request.runId
        )
          return;
        if (event.kind === "status" && event.status === "error") failed = true;
        if (event.kind === "output") {
          bytes += JSON.stringify(event).length;
          if (accepted++ > request.limits.output || bytes > 4_000_000) {
            if (
              accepted === request.limits.output + 2 ||
              bytes - JSON.stringify(event).length <= 4_000_000
            )
              this.emit({
                kind: "output",
                runId: request.runId,
                level: "warn",
                values: [
                  {
                    type: "truncated",
                    preview: "Output transport limit reached (4 MB).",
                  },
                ],
              });
            return;
          }
        }
        this.emit(event);
      });
      child.on("error", (error) => {
        if (generation === this.generation)
          this.emit({
            kind: "status",
            runId: request.runId,
            status: "error",
            message: error.message,
          });
      });
      child.on("exit", (code) => {
        if (this.child === child) this.child = undefined;
        void rm(directory, { recursive: true, force: true });
        if (generation === this.generation) {
          clearTimeout(this.timer);
          this.emit({
            kind: "status",
            runId: request.runId,
            status: code || failed ? "error" : "idle",
            message: code
              ? `Runtime exited (${code}). Memory limit or process termination.`
              : undefined,
          });
        }
      });
      child.send({ request, file });
      if (request.limits.timeout)
        this.timer = setTimeout(() => {
          void this.stop();
        }, request.limits.timeout);
    } catch (error) {
      await rm(directory, { recursive: true, force: true });
      if (generation === this.generation)
        this.emit({
          kind: "status",
          runId: request.runId,
          status: "error",
          message: String(error),
        });
    }
  }
}
