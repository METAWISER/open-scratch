import { spawn, type ChildProcess } from "node:child_process";
import { mkdir, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { StringDecoder } from "node:string_decoder";
import type { RunEvent, RunRequest } from "../shared/contracts";
import type { ExecutionEngine } from "./engine";
import { executionEnv } from "./node-runner";
import { terminateTree } from "./process-tree";

/** A generated offline project, compiled and executed outside Electron. */
export class CSharpRunner implements ExecutionEngine {
  private generation = 0;
  private child?: ChildProcess;
  private runId?: string;
  private timer?: ReturnType<typeof setTimeout>;
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
    const directory = join(this.workspace, ".csharp", runId);
    const alive = () => generation === this.generation;
    let count = 0,
      bytes = 0,
      truncated = false;
    const output = (text: string, level: string) => {
      if (!alive() || truncated || !text.trim()) return;
      bytes += text.length;
      if (count++ >= request.limits.output || bytes > 4_000_000) {
        truncated = true;
        this.emit({
          kind: "output",
          runId,
          level: "warn",
          values: [
            {
              type: "truncated",
              preview: "Output limit reached",
              truncated: true,
            },
          ],
        });
        return;
      }
      const match = /scratch\.cs\((\d+),\d+\)|scratch\.cs:line (\d+)/.exec(
        text,
      );
      this.emit({
        kind: "output",
        runId,
        level: /error CS\d+/.test(text) ? "error" : level,
        line: match ? Number(match[1] || match[2]) : undefined,
        values: [
          {
            type: "string",
            preview: text.slice(0, 8000),
            truncated: text.length > 8000,
          },
        ],
      });
    };
    const env = {
      ...executionEnv(tab.env),
      DOTNET_CLI_TELEMETRY_OPTOUT: "1",
      DOTNET_SKIP_FIRST_TIME_EXPERIENCE: "1",
      DOTNET_NOLOGO: "1",
      DOTNET_CLI_UI_LANGUAGE: "en",
      MSBuildEnableWorkloadResolver: "false",
    };
    // .NET/NuGet needs OS directory variables, never inherited credentials.
    for (const key of [
      "ProgramFiles",
      "ProgramFiles(x86)",
      "ProgramW6432",
      "ProgramData",
      "APPDATA",
      "LOCALAPPDATA",
    ]) {
      if (process.env[key])
        (env as NodeJS.ProcessEnv)[key] = tab.env[key] ?? process.env[key];
    }
    const command = tab.dotnetExecutable || "dotnet";
    const stage = (args: string[], cwd: string, capture = false) =>
      new Promise<{ code: number | null; text: string }>((resolve, reject) => {
        if (!alive()) {
          resolve({ code: null, text: "" });
          return;
        }
        const child = spawn(command, args, {
          cwd,
          env,
          shell: false,
          windowsHide: true,
          detached: process.platform !== "win32",
          stdio: ["ignore", "pipe", "pipe"],
        });
        this.child = child;
        let captured = "";
        for (const [stream, level] of [
          [child.stdout, "log"],
          [child.stderr, "error"],
        ] as const) {
          const decoder = new StringDecoder("utf8");
          let pending = "";
          stream.on("data", (data: Buffer) => {
            if (!alive()) return;
            const text = decoder.write(data);
            if (capture) {
              captured = (captured + text).slice(0, 8000);
              return;
            }
            if (truncated) return;
            pending += text;
            let newline: number;
            while ((newline = pending.indexOf("\n")) >= 0) {
              output(pending.slice(0, newline).replace(/\r$/, ""), level);
              pending = pending.slice(newline + 1);
            }
            if (pending.length > 8000) {
              output(pending, level);
              pending = "";
            }
          });
          stream.on("end", () => {
            if (!capture) output(pending + decoder.end(), level);
          });
        }
        child.once("error", reject);
        child.once("close", (code) => {
          if (this.child === child) this.child = undefined;
          resolve({ code, text: captured });
        });
      });
    if (request.limits.timeout)
      this.timer = setTimeout(() => void this.stop(), request.limits.timeout);
    try {
      await mkdir(directory, { recursive: true });
      const sdk = await stage(["--version"], directory, true);
      if (!alive()) return;
      const major = Number(/^(\d+)\./m.exec(sdk.text)?.[1]);
      if (sdk.code !== 0 || major < 8 || !Number.isFinite(major))
        throw new Error(
          "Install .NET SDK 8 or later (not just the runtime), or select its executable in Tab settings.",
        );
      await writeFile(
        join(directory, "scratch.cs"),
        '#line 1 "scratch.cs"\n' + tab.code,
        "utf8",
      );
      await writeFile(
        join(directory, "NuGet.Config"),
        "<configuration><packageSources><clear /></packageSources></configuration>",
      );
      await writeFile(
        join(directory, "Scratch.csproj"),
        `<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net${major}.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>enable</Nullable><EnableDefaultCompileItems>false</EnableDefaultCompileItems><UseAppHost>false</UseAppHost><NuGetAudit>false</NuGetAudit></PropertyGroup><ItemGroup><Compile Include="scratch.cs" /></ItemGroup></Project>`,
      );
      if (!alive()) return;
      const build = await stage(
        [
          "build",
          join(directory, "Scratch.csproj"),
          "--nologo",
          "--verbosity",
          "quiet",
          "--disable-build-servers",
          "-p:UseSharedCompilation=false",
          "-p:ImportDirectoryBuildProps=false",
          "-p:ImportDirectoryBuildTargets=false",
          `-p:RestoreConfigFile=${join(directory, "NuGet.Config")}`,
          "--output",
          join(directory, "out"),
        ],
        directory,
      );
      if (!alive()) return;
      if (build.code !== 0)
        throw new Error(
          "C# compilation failed. See compiler diagnostics in the output.",
        );
      const result = await stage(
        [join(directory, "out", "Scratch.dll")],
        tab.cwd || this.workspace,
      );
      if (alive())
        this.emit({
          kind: "status",
          runId,
          status: result.code === 0 ? "idle" : "error",
          message:
            result.code === 0
              ? undefined
              : `C# process exited (${result.code}).`,
        });
    } catch (error) {
      if (alive())
        this.emit({
          kind: "status",
          runId,
          status: "error",
          message: `C# / .NET: ${String(error)}. Check your SDK installation and executable path.`,
        });
    } finally {
      if (alive()) {
        clearTimeout(this.timer);
        this.runId = undefined;
      }
      await rm(directory, {
        recursive: true,
        force: true,
        maxRetries: 5,
        retryDelay: 100,
      }).catch(() => {});
    }
  }
}
