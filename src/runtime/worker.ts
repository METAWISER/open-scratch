import { pathToFileURL } from "node:url";
import { snapshotValues } from "./serialize";
import type { RunRequest, RunEvent } from "../shared/contracts";
const send = (event: RunEvent) => {
  if (process.connected) process.send?.(event);
};
process.once(
  "message",
  async (input: { request: RunRequest; file: string }) => {
    const { request, file } = input;
    const { limits, runId } = request;
    let count = 0;
    const emit = (level: string, values: unknown[], line?: number) => {
      if (count++ >= limits.output) {
        if (count === limits.output + 1)
          send({
            kind: "output",
            runId,
            level: "warn",
            values: [
              {
                type: "truncated",
                preview: `Output truncated after ${limits.output} entries. Adjust Preferences.`,
              },
            ],
          });
        return;
      }
      send({
        kind: "output",
        runId,
        level,
        line,
        values: snapshotValues(values, limits.depth, limits.entries),
      });
    };
    const sourceLine = () => {
      const stack = new Error().stack || "";
      return (
        Number(stack.match(/scratch\.(?:tsx?|jsx?):(\d+):/)?.[1]) || undefined
      );
    };
    for (const level of [
      "log",
      "info",
      "warn",
      "error",
      "debug",
      "table",
    ] as const)
      console[level] = (...values: unknown[]) =>
        emit(level, values, sourceLine());
    (globalThis as unknown as { __openscratchLog: unknown }).__openscratchLog =
      (
        value: unknown,
        line: number,
        transform?: (value: unknown) => unknown,
      ) => {
        emit("result", [transform ? transform(value) : value], line);
        return value;
      };
    const report = (error: unknown) => {
      let stack = "";
      try {
        if (error instanceof Error) stack = error.stack ?? "";
      } catch {
        /* Error metadata itself may throw. */
      }
      emit(
        "error",
        stack ? [error, stack] : [error],
        Number(stack.match(/scratch\.(?:tsx?|jsx?):(\d+):/)?.[1]) || undefined,
      );
    };
    process.on("uncaughtException", report);
    process.on("unhandledRejection", report);
    try {
      await import(pathToFileURL(file).href);
      send({ kind: "status", runId, status: "idle" });
    } catch (error) {
      report(error);
      send({ kind: "status", runId, status: "error" });
    }
  },
);
