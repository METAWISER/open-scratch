import { build } from "esbuild";
import { build as vite } from "vite";
import { cp, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
await mkdir("dist/types/@types", { recursive: true });
await cp(
  dirname(require.resolve("@types/node/package.json")),
  "dist/types/@types/node",
  { recursive: true },
);
const nodeRequire = createRequire(require.resolve("@types/node/package.json"));
await cp(
  dirname(nodeRequire.resolve("undici-types/package.json")),
  join("dist/types", "undici-types"),
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
if (!process.argv.includes('--main-only')) await vite({ logLevel: "warn" });
