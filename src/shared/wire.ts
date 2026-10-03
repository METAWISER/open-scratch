import type { RunEvent, Value } from "./contracts";
/** Validate untrusted process messages iteratively, before React sees any tree. */
export function validEvent(input: unknown): input is RunEvent {
  if (!input || typeof input !== "object") return false;
  const e = input as Record<string, unknown>;
  if (typeof e.runId !== "string" || e.runId.length > 100) return false;
  if (e.kind === "status")
    return (
      ["running", "idle", "stopped", "error"].includes(String(e.status)) &&
      (e.message === undefined ||
        (typeof e.message === "string" && e.message.length < 20000))
    );
  if (
    e.kind !== "output" ||
    typeof e.level !== "string" ||
    e.level.length > 20 ||
    !Array.isArray(e.values) ||
    e.values.length > 20
  )
    return false;
  if (
    e.line !== undefined &&
    (typeof e.line !== "number" || !Number.isInteger(e.line) || e.line < 1)
  )
    return false;
  const queue = e.values.map((value) => ({ value, depth: 0 }));
  let count = 0,
    characters = 0;
  while (queue.length) {
    const { value, depth } = queue.pop()!;
    if (++count > 22000 || depth > 14 || !value || typeof value !== "object")
      return false;
    const v = value as Value;
    if (typeof v.type !== "string" || typeof v.preview !== "string")
      return false;
    characters += v.type.length + v.preview.length;
    if (characters > 200000) return false;
    if (v.entries !== undefined) {
      if (!Array.isArray(v.entries) || v.entries.length > 1000) return false;
      for (const entry of v.entries) {
        if (
          !Array.isArray(entry) ||
          entry.length !== 2 ||
          typeof entry[0] !== "string"
        )
          return false;
        characters += entry[0].length;
        queue.push({ value: entry[1], depth: depth + 1 });
      }
    }
  }
  return true;
}
