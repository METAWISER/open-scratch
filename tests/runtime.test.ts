import { beforeAll, afterAll, describe, it, expect } from "vitest";
import { mkdtemp, rm, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { build } from "esbuild";
import { randomUUID } from "node:crypto";
import { NodeRunner } from "../src/runtime/node-runner";
import {
  newTab,
  defaultSettings,
  type RunEvent,
  type RunRequest,
} from "../src/shared/contracts";
import { StateStore } from "../src/main/store";
import { initialState } from "../src/shared/contracts";
import { lessons } from "../src/learning/catalog";
let root: string, runner: NodeRunner;
let events: RunEvent[] = [];
const request = (code: string): RunRequest => ({
  runId: randomUUID(),
  tab: { ...newTab("test"), code },
  autoLog: true,
  limits: { ...defaultSettings.limits, timeout: 10000 },
});
const waitFor = async (predicate: () => boolean) => {
  const end = Date.now() + 10000;
  while (!predicate()) {
    if (Date.now() > end) throw new Error(`Timeout: ${JSON.stringify(events)}`);
    await new Promise((r) => setTimeout(r, 20));
  }
};
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), "openscratch-test-"));
  await writeFile(join(root, "package.json"), '{"type":"module"}');
  await build({
    entryPoints: ["src/runtime/worker.ts"],
    outfile: join(root, "worker.cjs"),
    bundle: true,
    platform: "node",
    format: "cjs",
  });
  runner = new NodeRunner(root, join(root, "worker.cjs"), (event) =>
    events.push(event),
  );
});
afterAll(async () => {
  await runner?.stop();
  await rm(root, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 100,
  });
});
describe.sequential("real Node process", () => {
  it("executes all JavaScript and TypeScript learning examples", async () => {
    for (const lesson of lessons.filter((x) =>
      ["js", "ts"].includes(x.language),
    )) {
      events = [];
      const r = request(lesson.code);
      r.tab.language = lesson.language;
      await runner.run(r);
      await waitFor(() =>
        events.some(
          (e) =>
            e.kind === "status" &&
            (e.status === "idle" || e.status === "error"),
        ),
      );
      expect(
        events.some((e) => e.kind === "status" && e.status === "error"),
        lesson.id,
      ).toBe(false);
      expect(
        events.some((e) => e.kind === "output"),
        lesson.id,
      ).toBe(true);
    }
  });
  it("runs expressions, TS generics, top-level await and both module syntaxes", async () => {
    events = [];
    const r = request(
      "import {basename} from 'node:path';\ninterface Box<T>{value:T};\nconst box:Box<number>={value:await Promise.resolve(3)};\nbox.value\nrequire('node:path').basename('/a/b')\nbasename('/c/d')",
    );
    await runner.run(r);
    await waitFor(() =>
      events.some((e) => e.kind === "status" && e.status === "idle"),
    );
    const text = JSON.stringify(events);
    expect(text).toContain('"preview":"3"');
    expect(text).toContain('\\"b\\"');
    expect(text).toContain('\\"d\\"');
  });
  it("does not block transpilable type errors", async () => {
    events = [];
    await runner.run(request('const n: number = "still runs";\nn'));
    await waitFor(() =>
      events.some((e) => e.kind === "status" && e.status === "idle"),
    );
    expect(JSON.stringify(events)).toContain("still runs");
  });
  it("maps thrown errors and console locations to original source", async () => {
    events = [];
    await runner.run(
      request('\n\nconsole.log("hello");\nthrow new Error("mapped")'),
    );
    await waitFor(() =>
      events.some((e) => e.kind === "status" && e.status === "error"),
    );
    expect(JSON.stringify(events)).toContain("scratch.ts:4");
    expect(events.some((e) => e.kind === "output" && e.line === 3)).toBe(true);
  });
  it("kills infinite loops and starts a fresh execution", async () => {
    events = [];
    await runner.run(request("while(true){}"));
    await new Promise((r) => setTimeout(r, 200));
    const start = Date.now();
    await runner.stop();
    expect(Date.now() - start).toBeLessThan(4000);
    events = [];
    await runner.run(request("1+2"));
    await waitFor(() => events.some((e) => e.kind === "output"));
    expect(JSON.stringify(events)).toContain('"preview":"3"');
  });
  it("bounds output floods", async () => {
    events = [];
    const r = request("for(let i=0;i<100000;i++)console.log(i)");
    r.limits.output = 20;
    await runner.run(r);
    await waitFor(() =>
      events.some((e) => e.kind === "status" && e.status === "idle"),
    );
    expect(events.filter((e) => e.kind === "output")).toHaveLength(21);
    expect(JSON.stringify(events)).toContain("truncated");
  });
  it("ignores late results from replaced runs", async () => {
    events = [];
    const old = request('setTimeout(()=>console.log("STALE"),500)');
    await runner.run(old);
    const next = request("42");
    await runner.run(next);
    events = [];
    await waitFor(() => events.some((e) => e.kind === "output"));
    await new Promise((r) => setTimeout(r, 700));
    expect(events.every((e) => e.runId === next.runId)).toBe(true);
    expect(JSON.stringify(events)).not.toContain("STALE");
  });
  it("captures asynchronous rejections", async () => {
    events = [];
    await runner.run(request('Promise.reject(new Error("async failure"))'));
    await waitFor(() => JSON.stringify(events).includes("async failure"));
  });
  it("keeps only the newest concurrently requested execution", async () => {
    events = [];
    const first = request('"OUTDATED"');
    const last = request('"LATEST"');
    await Promise.all([runner.run(first), runner.run(last)]);
    await waitFor(() => JSON.stringify(events).includes("LATEST"));
    expect(
      events
        .filter((e) => e.kind === "output")
        .every((e) => e.runId === last.runId),
    ).toBe(true);
  });
  it("cleans up ordinary spawned children and their timers", async () => {
    const heartbeat = join(root, "heartbeat.txt");
    const script = `setInterval(()=>require('node:fs').writeFileSync(${JSON.stringify(heartbeat)},String(Date.now())),30)`;
    events = [];
    await runner.run(
      request(
        `require('node:child_process').spawn(process.execPath,['-e',${JSON.stringify(script)}],{stdio:'ignore'});`,
      ),
    );
    let exists = false;
    const end = Date.now() + 5000;
    while (!exists && Date.now() < end) {
      try {
        await readFile(heartbeat);
        exists = true;
      } catch {
        await new Promise((r) => setTimeout(r, 30));
      }
    }
    expect(exists).toBe(true);
    await runner.stop();
    const last = await readFile(heartbeat, "utf8");
    await new Promise((r) => setTimeout(r, 150));
    expect(await readFile(heartbeat, "utf8")).toBe(last);
  });
});
describe("persistent state", () => {
  it("round trips tabs and snippets without plaintext secrets", async () => {
    const store = new StateStore(join(root, "workspace.json"));
    const state = initialState();
    state.tabs[0].env = { SECRET: "secret" };
    state.tabs[0].code = "123";
    state.snippets = [{ ...state.tabs[0] }];
    await store.save(state);
    const restored = await store.load();
    expect(restored.tabs[0].code).toBe("123");
    expect(restored.snippets).toHaveLength(1);
    expect(restored.tabs[0].env).toEqual({});
  });
  it("preserves invalid data instead of silently replacing it", async () => {
    const file = resolve(root, "invalid.json");
    await writeFile(file, "{broken");
    await expect(new StateStore(file).load()).rejects.toThrow(
      "original file preserved",
    );
  });
});
