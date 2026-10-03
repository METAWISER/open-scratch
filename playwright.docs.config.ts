import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/docs",
  timeout: 30000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:4174",
    viewport: { width: 1440, height: 1000 },
  },
  webServer: {
    command: `"${process.execPath}" node_modules/vite/bin/vite.js --config website/vite.config.ts`,
    url: "http://127.0.0.1:4174",
    reuseExistingServer: !process.env.CI,
  },
});
