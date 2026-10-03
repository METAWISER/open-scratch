import { snapshotValues } from "./serialize";
declare global {
  interface Window {
    __scratchOutput: { send: (payload: unknown) => void };
    __runConfig: {
      runId: string;
      depth: number;
      entries: number;
      output: number;
    };
    __openscratchLog: (
      value: unknown,
      line: number,
      transform?: (value: unknown) => unknown,
    ) => unknown;
  }
}
const config = window.__runConfig;
let count = 0;
function emit(
  level: string,
  values: unknown[],
  line?: number,
  column?: number,
  generated = false,
) {
  if (count++ >= config.output) {
    if (count === config.output + 1)
      window.__scratchOutput.send({
        kind: "output",
        runId: config.runId,
        level: "warn",
        values: [
          {
            type: "truncated",
            preview: "Output truncated. Adjust Preferences.",
          },
        ],
      });
    return;
  }
  window.__scratchOutput.send({
    kind: "output",
    runId: config.runId,
    level,
    line,
    column,
    generated,
    values: snapshotValues(values, config.depth, config.entries),
  });
}
function location(stack: string) {
  const match = stack.match(/openscratch-user\.js:(\d+):(\d+)/);
  return {
    line: match ? Number(match[1]) : undefined,
    column: match ? Number(match[2]) : undefined,
  };
}
for (const level of ["log", "info", "warn", "error", "debug", "table"] as const)
  console[level] = (...values: unknown[]) => {
    const pos = location(new Error().stack ?? "");
    emit(level, values, pos.line, pos.column, true);
  };
window.__openscratchLog = (value, line, transform) => {
  emit("result", [transform ? transform(value) : value], line);
  return value;
};
function report(error: unknown) {
  let stack = "";
  try {
    if (error instanceof Error) stack = error.stack ?? "";
  } catch {
    /* Runtime metadata may throw. */
  }
  const pos = location(stack);
  emit("error", stack ? [error, stack] : [error], pos.line, pos.column, true);
}
window.addEventListener("error", (event) =>
  report(event.error || event.message),
);
window.addEventListener("unhandledrejection", (event) => report(event.reason));
