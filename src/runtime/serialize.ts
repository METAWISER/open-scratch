import type { Value } from "../shared/contracts";
/** Bounded snapshots, never property reads on inspected objects. Proxy traps can still
 * execute; the caller always lives in a disposable execution process. */
export function serialize(value: unknown, depth = 5, maxEntries = 100): Value {
  const seen = new Map<object, number>();
  let budget = maxEntries;
  const visit = (v: unknown, d: number): Value => {
    const type = typeof v;
    if (v === null) return { type: "null", preview: "null" };
    if (type === "string")
      return {
        type,
        preview: JSON.stringify((v as string).slice(0, 8000)),
        truncated: (v as string).length > 8000,
      };
    if (type !== "object" && type !== "function")
      return { type, preview: type === "bigint" ? `${v}n` : String(v) };
    const obj = v as object;
    const ref = seen.get(obj);
    if (ref) return { type: "reference", preview: `↩ #${ref}` };
    const id = seen.size + 1;
    seen.set(obj, id);
    if (d <= 0 || budget <= 0)
      return { type: "object", preview: "…", truncated: true, id };
    try {
      let label = Array.isArray(obj)
        ? "Array"
        : type === "function"
          ? "Function"
          : "Object";
      const entries: [string, Value][] = [];
      const add = (k: string, x: unknown) => {
        if (budget-- <= 0) return false;
        entries.push([k, visit(x, d - 1)]);
        return true;
      };
      if (obj instanceof Date)
        return {
          type: "date",
          preview: Date.prototype.toISOString.call(obj),
          id,
        };
      if (obj instanceof Map) {
        label = "Map";
        for (const [k, x] of Map.prototype.entries.call(obj)) {
          if (!add(String(entries.length), [k, x])) break;
        }
      } else if (obj instanceof Set) {
        label = "Set";
        for (const x of Set.prototype.values.call(obj)) {
          if (!add(String(entries.length), x)) break;
        }
      } else {
        if (obj instanceof Error) label = "Error";
        for (const key of Reflect.ownKeys(obj)) {
          if (key === "length" && Array.isArray(obj)) continue;
          if (budget <= 0) break;
          const desc = Object.getOwnPropertyDescriptor(obj, key);
          if (!desc) continue;
          if ("value" in desc) {
            if (!add(String(key), desc.value)) break;
          } else {
            budget--;
            entries.push([
              String(key),
              { type: "accessor", preview: "[Getter/Setter]" },
            ]);
          }
        }
      }
      return {
        type: label.toLowerCase(),
        preview: label,
        id,
        entries,
        truncated: budget <= 0,
      };
    } catch {
      return { type: "uninspectable", preview: "[Inspection failed]", id };
    }
  };
  return visit(value, depth);
}
export function snapshotValues(
  values: unknown[],
  depth: number,
  entries: number,
): Value[] {
  const snapshots = values
    .slice(0, 20)
    .map((value) => serialize(value, depth, entries));
  if (values.length > 20)
    snapshots[19] = {
      type: "truncated",
      preview: "Additional arguments omitted after 20 values.",
    };
  if (JSON.stringify(snapshots).length > 180000)
    return [
      {
        type: "truncated",
        preview:
          "Snapshot exceeded the 180 KB transport limit. Reduce inspection depth or entries.",
      },
    ];
  return snapshots;
}
