import { spawn } from "node:child_process";
import { build } from "esbuild";
import { createServer } from "vite";
import electron from "electron";
import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname } from "node:path";
const require = createRequire(import.meta.url);
await mkdir("dist/types/@types", { recursive: true });
await cp(
  dirname(require.resolve("@types/node/package.json")),
  "dist/types/@types/node",
  { recursive: true },
);
await cp(
  dirname(
    createRequire(require.resolve("@types/node/package.json")).resolve(
      "undici-types/package.json",
    ),
  ),
  "dist/types/undici-types",
  { recursive: true },
);
await build({
  entryPoints: {
    main: "src/main/main.ts",
    preload: "src/main/preload.ts",
    worker: "src/runtime/worker.ts",
    "browser-preload": "src/runtime/browser-preload.ts",
  },
  outdir: "dist",
  outExtension: { ".js": ".cjs" },
  bundle: true,
  platform: "node",
  format: "cjs",
  packages: "external",
  sourcemap: true,
  define: { "import.meta.url": "__filename" },
});
await build({
  entryPoints: ["src/runtime/browser-bootstrap.ts"],
  outfile: "dist/browser-bootstrap.js",
  bundle: true,
  platform: "browser",
  format: "iife",
});
const server = await createServer();
await server.listen();
const child = spawn(electron, ["."], {
  stdio: "inherit",
  env: { ...process.env, OPENSCRATCH_DEV: "http://127.0.0.1:5173" },
});
child.on("exit", async (code) => {
  await server.close();
  process.exit(code ?? 0);
});
