import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { copyFile } from "node:fs/promises";
export default defineConfig({
  root: resolve("website"),
  base: "./",
  plugins: [
    react(),
    {
      name: "distributed-license-notices",
      apply: "build",
      async closeBundle() {
        await Promise.all([
          copyFile(resolve("LICENSE"), resolve("dist-docs/LICENSE.txt")),
          copyFile(
            resolve("THIRD_PARTY_NOTICES.md"),
            resolve("dist-docs/third-party-notices.txt"),
          ),
        ]);
      },
    },
  ],
  server: {
    host: "127.0.0.1",
    port: 4174,
    strictPort: true,
    fs: { allow: [resolve(".")] },
  },
  build: { outDir: resolve("dist-docs"), emptyOutDir: true },
});
