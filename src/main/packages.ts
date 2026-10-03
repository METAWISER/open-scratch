import { spawn, type ChildProcess } from "node:child_process";
import { terminateTree } from "../runtime/process-tree";
import { executionEnv } from "../runtime/node-runner";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { join, relative, dirname } from "node:path";
import type { PackageInfo } from "../shared/contracts";
const require = createRequire(import.meta.url);
const namePattern = /^(?:@[a-z0-9._-]+\/)?[a-z0-9][a-z0-9._-]*$/i;
export class Packages {
  private busy = false;
  private child?: ChildProcess;
  async stop() {
    const child = this.child;
    this.child = undefined;
    await terminateTree(child);
  }
  constructor(
    readonly root: string,
    private log: (text: string) => void,
    private bundledTypes?: string,
    private npmCli?: string,
  ) {}
  async init() {
    await mkdir(this.root, { recursive: true });
    try {
      await readFile(join(this.root, "package.json"));
    } catch {
      await writeFile(
        join(this.root, "package.json"),
        JSON.stringify(
          {
            name: "openscratch-workspace",
            private: true,
            type: "module",
            dependencies: {},
          },
          null,
          2,
        ),
      );
    }
  }
  async list(): Promise<PackageInfo[]> {
    await this.init();
    const data = JSON.parse(
      await readFile(join(this.root, "package.json"), "utf8"),
    );
    return Object.entries(data.dependencies ?? {}).map(([name, version]) => ({
      name,
      version: String(version),
    }));
  }
  async search(query: string): Promise<PackageInfo[]> {
    const response = await fetch(
      `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=12`,
      { signal: AbortSignal.timeout(15000) },
    );
    if (!response.ok) throw new Error(`Registry: ${response.status}`);
    const data = (await response.json()) as {
      objects: { package: PackageInfo }[];
    };
    return data.objects.map((x) => x.package);
  }
  async change(
    action: "install" | "remove",
    name: string,
    version = "latest",
    scripts = false,
  ) {
    if (this.busy) throw new Error("Another package operation is running");
    if (!namePattern.test(name) || !/^[-\w.^~*+<>=| ]{1,100}$/.test(version))
      throw new Error("Invalid package name/version");
    this.busy = true;
    try {
      await this.init();
      const cli =
        this.npmCli ??
        join(dirname(require.resolve("npm/package.json")), "bin", "npm-cli.js")
          .replace("app.asar\\", "app.asar.unpacked\\")
          .replace("app.asar/", "app.asar.unpacked/");
      const args = [
        cli,
        action === "install" ? "install" : "uninstall",
        action === "install" ? `${name}@${version}` : name,
        "--save-exact",
        "--no-audit",
        "--no-fund",
        `--ignore-scripts=${!scripts}`,
      ];
      await new Promise<void>((resolve, reject) => {
        const child = spawn(process.execPath, args, {
          cwd: this.root,
          env: executionEnv({}),
          windowsHide: true,
          shell: false,
          detached: process.platform !== "win32",
        });
        this.child = child;
        let length = 0;
        const output = (b: Buffer) => {
          if (length < 100000) {
            const text = b.toString().slice(0, 8000);
            length += text.length;
            this.log(text);
          }
        };
        child.stdout.on("data", output);
        child.stderr.on("data", output);
        child.on("error", reject);
        child.on("exit", (code) =>
          code === 0
            ? resolve()
            : reject(new Error(`npm exited with code ${code}`)),
        );
      });
      return await this.list();
    } finally {
      this.busy = false;
      this.child = undefined;
    }
  }
  async types() {
    const result: { path: string; content: string }[] = [];
    let bytes = 0;
    const walk = async (dir: string, depth: number): Promise<void> => {
      if (depth > 12 || bytes > 8_000_000 || result.length >= 1500) return;
      let entries;
      try {
        entries = await readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }
      for (const item of entries) {
        if (item.name.startsWith(".")) continue;
        const path = join(dir, item.name);
        if (item.isDirectory()) await walk(path, depth + 1);
        else if (item.name.endsWith(".d.ts") || item.name === "package.json") {
          const content = await readFile(path, "utf8");
          if (content.length < 1_000_000) {
            bytes += content.length;
            result.push({
              path: relative(this.root, path).replaceAll("\\", "/"),
              content,
            });
          }
        }
      }
    };
    await walk(join(this.root, "node_modules"), 0);
    if (this.bundledTypes) {
      const saved = result.splice(0);
      await walk(this.bundledTypes, 0);
      for (const file of result)
        file.path =
          "node_modules/" +
          relative(this.bundledTypes, join(this.root, file.path)).replaceAll(
            "\\",
            "/",
          );
      result.push(...saved);
    }
    return result;
  }
}
