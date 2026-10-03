import { describe, it, expect } from "vitest";
import { serialize, snapshotValues } from "../src/runtime/serialize";
import { instrument } from "../src/compiler/instrument";
import { executionEnv } from "../src/runtime/node-runner";
import { buildContext, composeAI, acceptProposal } from "../src/ai/service";
import type { AIProvider } from "../src/ai/contracts";
import { newTab } from "../src/shared/contracts";
import { validEvent } from "../src/shared/wire";
it("rejects malformed and deeply nested runtime output", () => {
  expect(
    validEvent({
      kind: "output",
      runId: "x",
      level: "log",
      values: [{ type: "object", preview: "Object", entries: [null] }],
    }),
  ).toBe(false);
  expect(
    validEvent({
      kind: "output",
      runId: "x",
      level: "log",
      values: [{ type: "number", preview: "3" }],
    }),
  ).toBe(true);
});
describe("inspector", () => {
  it("shows truncation for oversized transport snapshots", () => {
    const value = Array.from({ length: 100 }, () => "x".repeat(8000));
    expect(snapshotValues([value], 5, 100)[0].type).toBe("truncated");
  });
  it("captures rich and circular values without getters", () => {
    let reads = 0;
    const x: Record<string, unknown> = {
      a: [1, undefined, 1n],
      map: new Map([["x", 2]]),
      set: new Set([3]),
      date: new Date("2020-01-01"),
      error: new Error("oops"),
    };
    x.self = x;
    Object.defineProperty(x, "danger", {
      get() {
        reads++;
        throw Error("getter");
      },
    });
    const value = serialize(x);
    expect(reads).toBe(0);
    expect(JSON.stringify(value)).toContain("reference");
    expect(JSON.stringify(value)).toContain("Getter/Setter");
    expect(JSON.stringify(value)).toContain("2020-01-01");
  });
  it("bounds depth and size", () => {
    expect(serialize({ a: { b: 3 } }, 1).entries?.[0][1].truncated).toBe(true);
    expect(
      serialize(
        Array.from({ length: 1000 }, (_, i) => i),
        5,
        10,
      ).truncated,
    ).toBe(true);
  });
});
describe("AST instrumentation", () => {
  const evaluate = (code: string, autoLog = true, logpoints: number[] = []) => {
    const values: unknown[] = [];
    const out = instrument(code, "scratch.ts", {
      autoLog,
      logpoints,
      hook: "log",
    });
    new Function("log", out)(
      (value: unknown, _line: number, transform?: (v: unknown) => unknown) => {
        values.push(transform ? transform(value) : value);
        return value;
      },
    );
    return values;
  };
  it("logs top level expressions once in execution order", () =>
    expect(evaluate("let x=0;\n++x;\nx")).toEqual([1, 1]));
  it("preserves directives and ignores console duplicate result", () => {
    expect(
      instrument('"use strict";\nconsole.log(1)', "scratch.js", {
        autoLog: true,
        logpoints: [],
        hook: "log",
      }),
    ).not.toContain("log(console");
  });
  it("supports nested declaration logpoints", () =>
    expect(
      evaluate("function f(){\nconst x=3;\nreturn x;\n}\nf()", false, [2]),
    ).toEqual([3]));
  it("implements comment values, transforms and inline chains", () => {
    expect(evaluate("[1,2,3] //? $.length", false)).toEqual([3]);
    expect(evaluate("[1,2].map(x=>x+1) /*?*/ .filter(x=>x>2)", false)).toEqual([
      [2, 3],
    ]);
  });
  it("does not interpret comment-like string literals", () =>
    expect(evaluate('const x="//?";\nx', false)).toEqual([]));
  it("supports conditions and per-iteration magic comments", () => {
    expect(evaluate("if (true) /*?*/ {}", false)).toEqual([true]);
    expect(evaluate("for (const item of [1,2]) /*?*/ {}", false)).toEqual([
      1, 2,
    ]);
    expect(
      evaluate("for (const [a,b] of [[1,2]]) /*? $.length */ {}", false),
    ).toEqual([2]);
  });
  it("does not change method receivers when an unsupported reference is marked", () => {
    expect(() =>
      evaluate("const o={f(){return this}};o.f /*?*/ ()", false),
    ).toThrow("method reference");
  });
});
describe("AI extension boundary", () => {
  const mock: AIProvider = {
    id: "test-only",
    capabilities: { streaming: true, local: true, actions: ["explain"] },
    async *stream(_request, { signal }) {
      signal.throwIfAborted();
      yield { type: "text", text: "Explanation" };
      yield { type: "done" };
    },
  };
  it("streams through injected provider without runtime changes", async () => {
    const result = [];
    for await (const chunk of composeAI(mock).invoke(
      { action: "explain", messages: [], context: buildContext(newTab("a")) },
      new AbortController().signal,
    ))
      result.push(chunk);
    expect(result).toHaveLength(2);
  });
  it("supports cancellation", async () => {
    const abort = new AbortController();
    abort.abort();
    const stream = composeAI(mock).invoke(
      {
        action: "explain",
        messages: [],
        context: buildContext(newTab("a")),
      },
      abort.signal,
    );
    await expect(stream[Symbol.asyncIterator]().next()).rejects.toThrow();
  });
  it("excludes secrets and requires explicit proposal acceptance", () => {
    const tab = newTab("x");
    tab.env = { SECRET: "private" };
    tab.cwd = "/private";
    expect(JSON.stringify(buildContext(tab))).not.toContain("private");
    expect(
      acceptProposal("a", { original: "a", replacement: "b" }, false),
    ).toBe("a");
    expect(() =>
      acceptProposal("changed", { original: "a", replacement: "b" }, true),
    ).toThrow();
  });
  it("strips inherited credentials from execution environment", () => {
    process.env.OPENSCRATCH_TEST_SECRET = "private";
    expect(executionEnv({ PUBLIC: "yes" })).not.toHaveProperty(
      "OPENSCRATCH_TEST_SECRET",
    );
    delete process.env.OPENSCRATCH_TEST_SECRET;
  });
});
