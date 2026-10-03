import { spawnSync } from "node:child_process";
const checks = [
  ["node_modules/typescript/bin/tsc", "--noEmit"],
  ["node_modules/eslint/bin/eslint.js", "."],
  ["node_modules/vitest/vitest.mjs", "run"],
  ["scripts/build.mjs"],
];
for (const args of checks) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
