import { afterEach, beforeAll, afterAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { CSharpRunner } from "../src/runtime/csharp-runner";
import {
  defaultSettings,
  newTab,
  type RunRequest,
  type RunEvent,
} from "../src/shared/contracts";
import { lessons } from "../src/learning/catalog";
let events: RunEvent[] = [],
  runner: CSharpRunner,
  directory: string;
const request = (code: string): RunRequest => ({
  runId: randomUUID(),
  tab: { ...newTab("cs"), language: "cs", runtime: "dotnet", code },
  autoLog: false,
  limits: { ...defaultSettings.limits, timeout: 60000 },
});
beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "openscratch-cs-"));
  runner = new CSharpRunner(directory, (e) => events.push(e));
});
afterEach(async () => {
  await runner.stop();
  events = [];
});
afterAll(async () => {
  await rm(directory, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
});
describe.sequential("C# SDK runtime", () => {
  it("compiles and executes every C# learning example offline", async () => {
    for (const lesson of lessons.filter((x) => x.language === "cs")) {
      events = [];
      await runner.run(request(lesson.code));
      expect(
        events.some((e) => e.kind === "status" && e.status === "error"),
        JSON.stringify(events),
      ).toBe(false);
      expect(
        events.some((e) => e.kind === "status" && e.status === "idle"),
      ).toBe(true);
    }
  }, 90000);
  it("maps compile and runtime errors to original lines", async () => {
    await runner.run(request('int x = "wrong";'));
    expect(
      events.some(
        (e) => e.kind === "output" && e.level === "error" && e.line === 1,
      ),
      JSON.stringify(events),
    ).toBe(true);
    events = [];
    await runner.run(
      request(
        'Console.WriteLine("start");\nthrow new Exception("original line");',
      ),
    );
    expect(
      events.some((e) => e.kind === "output" && e.line === 2),
      JSON.stringify(events),
    ).toBe(true);
  }, 60000);
  it("stops an active infinite loop and can execute again", async () => {
    const work = runner.run(
      request('Console.WriteLine("CS_STARTED"); while(true) {}'),
    );
    const until = Date.now() + 45000;
    while (!JSON.stringify(events).includes("CS_STARTED")) {
      if (Date.now() > until) throw new Error(JSON.stringify(events));
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    await runner.stop();
    await work;
    events = [];
    await runner.run(request("Console.WriteLine(21 * 2);"));
    expect(JSON.stringify(events)).toContain('"preview":"42"');
  }, 90000);
  it("bounds output and reports missing SDK", async () => {
    const flood = request("for (int i=0;i<100000;i++) Console.WriteLine(i);");
    flood.limits.output = 10;
    await runner.run(flood);
    expect(
      events.filter((e) => e.kind === "output").length,
    ).toBeLessThanOrEqual(11);
    expect(JSON.stringify(events)).toContain("Output limit reached");
    events = [];
    const missing = request("Console.WriteLine(42);");
    missing.tab.dotnetExecutable = "openscratch-dotnet-missing";
    await runner.run(missing);
    expect(JSON.stringify(events)).toContain("SDK installation");
  }, 60000);
});
