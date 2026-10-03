import type { RunRequest } from "../shared/contracts";

/** Engines execute only in a dedicated process or web context. */
export interface ExecutionEngine {
  run(request: RunRequest): Promise<void>;
  stop(): Promise<void> | void;
}
