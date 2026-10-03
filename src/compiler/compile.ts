import { randomUUID } from "node:crypto";
import { join } from "node:path";
import { createRequire } from "node:module";
import type { RunRequest } from "../shared/contracts";
import { instrument } from "./instrument";
export async function compile(
  request: RunRequest,
  workspace: string,
): Promise<string> {
  const localRequire = createRequire(import.meta.url);
  const esbuildPackage = localRequire.resolve("esbuild/package.json");
  if (esbuildPackage.includes("app.asar")) {
    const binary = createRequire(esbuildPackage).resolve(
      `@esbuild/${process.platform}-${process.arch}/${process.platform === "win32" ? "esbuild.exe" : "bin/esbuild"}`,
    );
    process.env.ESBUILD_BINARY_PATH = binary
      .replace("app.asar\\", "app.asar.unpacked\\")
      .replace("app.asar/", "app.asar.unpacked/");
  }
  const { build } = await import("esbuild");
  const { tab } = request;
  if (tab.language === "py")
    throw new Error("Python requires the Python runtime.");
  const hook = `__os_${randomUUID().replaceAll("-", "")}`;
  const filename = `scratch.${tab.language}`;
  const code = instrument(tab.code, filename, {
    autoLog: request.autoLog,
    logpoints: tab.logpoints,
    hook,
  });
  const node = tab.runtime === "node";
  const requireBanner = node
    ? `import {createRequire as __createRequire} from 'node:module';const __localRequire=__createRequire(${JSON.stringify(join(tab.cwd || workspace, "package.json"))});const __workspaceRequire=__createRequire(${JSON.stringify(join(workspace, "package.json"))});const require=(id)=>{try{return __localRequire(id)}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e;return __workspaceRequire(id)}};`
    : "";
  const result = await build({
    stdin: {
      contents: code,
      sourcefile: filename,
      resolveDir: tab.cwd || workspace,
      loader: tab.language,
    },
    bundle: true,
    write: false,
    format: "esm",
    platform: node ? "node" : "browser",
    target: node ? "node22" : "chrome130",
    sourcemap: "inline",
    sourcesContent: true,
    jsx: "automatic",
    nodePaths: [join(workspace, "node_modules")],
    banner: {
      js: `${requireBanner}const ${hook}=globalThis.__openscratchLog;`,
    },
    logLevel: "silent",
    plugins: node
      ? [
          {
            name: "native-dependencies",
            setup(b) {
              b.onResolve({ filter: /^[^./]|^@/ }, (args) => {
                if (args.path.startsWith("node:"))
                  return { path: args.path, external: true };
                // Keep installed packages native (including native addons and conditional ESM exports).
                if (
                  args.kind === "import-statement" ||
                  args.kind === "dynamic-import"
                ) {
                  const req = createRequire(join(workspace, "package.json"));
                  try {
                    const resolved = req.resolve(args.path);
                    if (!resolved.includes("node_modules"))
                      return { path: args.path, external: true };
                    return { path: args.path, external: true };
                  } catch {
                    return undefined;
                  }
                }
                return undefined;
              });
            },
          },
        ]
      : [],
  });
  return result.outputFiles[0].text;
}
