import { afterEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { PythonRunner } from "../src/runtime/python-runner";
import {
  defaultSettings,
  newTab,
  stateSchema,
  initialState,
  type RunEvent,
  type RunRequest,
} from "../src/shared/contracts";
import { lessons, referenceFor, searchLessons } from "../src/learning/catalog";
let events: RunEvent[] = [];
const runner = new PythonRunner(process.cwd(), (event) => events.push(event));
const request = (code: string): RunRequest => ({
  runId: randomUUID(),
  tab: { ...newTab("python"), language: "py", runtime: "python", code },
  autoLog: true,
  limits: { ...defaultSettings.limits, timeout: 10000 },
});
async function wait(predicate: () => boolean) {
  const until = Date.now() + 10000;
  while (!predicate()) {
    if (Date.now() > until) throw new Error(JSON.stringify(events));
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}
async function execute(code: string) {
  events = [];
  const r = request(code);
  await runner.run(r);
  await wait(() =>
    events.some(
      (e) =>
        e.runId === r.runId &&
        e.kind === "status" &&
        ["idle", "error"].includes(e.status),
    ),
  );
  return events.filter((e) => e.kind === "output");
}
afterEach(async () => {
  await runner.stop();
});
describe.sequential("Python process", () => {
  it("runs AST expressions once, imports and top-level await", async () => {
    const output = await execute(
      "import asyncio\nvalues = []\nvalues.append(3)\nlen(values)\nawait asyncio.sleep(0)\nsum(values)",
    );
    expect(output.map((e) => e.values[0].preview)).toEqual(["1", "3"]);
    expect(output.map((e) => e.line)).toEqual([4, 6]);
  });
  it("inspects circular collections without calling custom repr or properties", async () => {
    const output = await execute(
      "class Unsafe:\n    def __repr__(self):\n        raise RuntimeError('do not call')\nx = [Unsafe()]\nx.append(x)\nx",
    );
    expect(JSON.stringify(output)).toContain("Circular/reference");
    expect(JSON.stringify(output)).toContain("custom inspection disabled");
    expect(output[0].level).toBe("result");
  });
  it("reports original lines for syntax and runtime errors", async () => {
    let output = await execute("x = 2\n1 / 0");
    expect(output[0].line).toBe(2);
    expect(output[0].values[0].preview).toContain("ZeroDivisionError");
    output = await execute("x = 2\nif:");
    expect(output[0].line).toBe(2);
    expect(output[0].values[0].preview).toContain("SyntaxError");
  });
  it("stops a running infinite loop and runs another snippet", async () => {
    events = [];
    await runner.run(request("print('started')\nwhile True: pass"));
    await wait(() => JSON.stringify(events).includes("started"));
    await runner.stop();
    expect((await execute("6 * 7"))[0].values[0].preview).toBe("42");
  });
  it("bounds flooding output and discards a replaced run", async () => {
    const output = await execute("for n in range(100000): print(n)");
    expect(output.length).toBeLessThanOrEqual(
      defaultSettings.limits.output + 2,
    );
    expect(JSON.stringify(output)).toContain("limit");
    events = [];
    await runner.run(
      request(
        "import time\nprint('started')\ntime.sleep(2)\nprint('OBSOLETE')",
      ),
    );
    await wait(() => JSON.stringify(events).includes("started"));
    await execute("42");
    expect(JSON.stringify(events)).not.toContain("OBSOLETE");
  });
  it("shows actionable missing interpreter errors", async () => {
    events = [];
    const r = request("42");
    r.tab.pythonExecutable = "openscratch-nonexistent-python-executable";
    await runner.run(r);
    await wait(() =>
      events.some((e) => e.kind === "status" && e.status === "error"),
    );
    expect(JSON.stringify(events)).toContain("Install Python");
  });
  it("executes every Python learning example", async () => {
    for (const lesson of lessons.filter((x) => x.language === "py")) {
      const output = await execute(lesson.code);
      expect(output.length, lesson.id).toBeGreaterThan(0);
      expect(
        output.some((e) => e.level === "error"),
        lesson.id,
      ).toBe(false);
    }
  });
});
it("finds intent and filters languages, only opens known references", () => {
  expect(searchLessons("sumar", "js").map((x) => x.id)).toContain("js-reduce");
  expect(searchLessons("forEach", "py").map((x) => x.id)).toContain("py-for");
  expect(searchLessons("genéricos", "ts").map((x) => x.id)).toContain(
    "ts-generics",
  );
  expect(referenceFor("https://evil.example")).toBeUndefined();
});
it("loads older v1 state without a Python executable field", () => {
  const state = initialState();
  const legacy = JSON.parse(JSON.stringify(state));
  delete legacy.tabs[0].pythonExecutable;
  expect(stateSchema.parse(legacy).tabs[0].pythonExecutable).toBe("");
});
