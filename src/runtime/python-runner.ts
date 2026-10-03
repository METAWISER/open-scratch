import { spawn, type ChildProcess } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import type { RunRequest, RunEvent } from "../shared/contracts";
import type { ExecutionEngine } from "./engine";
import { executionEnv } from "./node-runner";
import { terminateTree } from "./process-tree";
import { validEvent } from "../shared/wire";
import { pythonWorker } from "./python-worker";

export class PythonRunner implements ExecutionEngine {
  private child?: ChildProcess;
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private runId?: string;
  constructor(
    private workspace: string,
    private emit: (event: RunEvent) => void,
  ) {}
  async stop() {
    this.generation++;
    clearTimeout(this.timer);
    const child = this.child,
      runId = this.runId;
    this.child = undefined;
    this.runId = undefined;
    await terminateTree(child);
    if (runId) this.emit({ kind: "status", runId, status: "stopped" });
  }
  async run(request: RunRequest) {
    const stopping = this.stop(),
      generation = this.generation;
    await stopping;
    if (generation !== this.generation) return;
    const { runId, tab } = request;
    this.runId = runId;
    this.emit({ kind: "status", runId, status: "running" });
    const automatic = !tab.pythonExecutable;
    const command =
      tab.pythonExecutable || (process.platform === "win32" ? "py" : "python3");
    const args = [
      ...(automatic && process.platform === "win32" ? ["-3"] : []),
      "-u",
      "-X",
      "utf8",
      "-c",
      pythonWorker,
    ];
    const child = spawn(command, args, {
      cwd: tab.cwd || this.workspace,
      env: executionEnv(tab.env),
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child = child;
    let pending = "",
      bytes = 0,
      count = 0,
      truncated = false,
      failed = false;
    const decoder = new StringDecoder("utf8");
    const deliver = (event: RunEvent) => {
      if (generation !== this.generation) return;
      if (event.kind === "output" && event.level === "error") failed = true;
      this.emit(event);
    };
    const truncate = () => {
      if (truncated) return;
      truncated = true;
      deliver({
        kind: "output",
        runId,
        level: "warn",
        values: [
          {
            type: "truncated",
            preview: "Output transport limit reached",
            truncated: true,
          },
        ],
      });
    };
    child.stdout.on("data", (data: Buffer) => {
      if (generation !== this.generation || truncated) return;
      bytes += data.length;
      if (bytes > 4_000_000) {
        truncate();
        return;
      }
      pending += decoder.write(data);
      if (pending.length > 250_000) {
        pending = "";
        truncate();
        return;
      }
      let index: number;
      while ((index = pending.indexOf("\n")) >= 0) {
        const line = pending.slice(0, index);
        pending = pending.slice(index + 1);
        if (count++ > request.limits.output) {
          truncate();
          return;
        }
        try {
          const event: unknown = JSON.parse(line);
          if (
            validEvent(event) &&
            event.kind === "output" &&
            event.runId === runId
          )
            deliver(event);
        } catch {
          deliver({
            kind: "output",
            runId,
            level: "log",
            values: [{ type: "string", preview: line.slice(0, 8000) }],
          });
        }
      }
    });
    child.stderr.on("data", (data: Buffer) => {
      if (count++ > request.limits.output) {
        truncate();
        return;
      }
      deliver({
        kind: "output",
        runId,
        level: "error",
        values: [
          { type: "string", preview: data.toString("utf8").slice(0, 8000) },
        ],
      });
    });
    child.stdin.on("error", () => {});
    child.once("error", (error) => {
      failed = true;
      deliver({
        kind: "status",
        runId,
        status: "error",
        message: `Cannot start Python (${command}): ${error.message}. Install Python 3.10+ or choose its executable in Tab settings.`,
      });
    });
    child.once("close", (code) => {
      if (this.child === child) this.child = undefined;
      if (generation === this.generation) {
        clearTimeout(this.timer);
        this.runId = undefined;
        deliver({
          kind: "status",
          runId,
          status: code || failed ? "error" : "idle",
        });
      }
    });
    child.stdin.end(JSON.stringify(request));
    if (request.limits.timeout)
      this.timer = setTimeout(() => void this.stop(), request.limits.timeout);
  }
}
