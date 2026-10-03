import { afterEach, expect, it, vi } from "vitest";
import { mkdtemp, readFile, rename, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { StateStore } from "../src/main/store";
import { initialState } from "../src/shared/contracts";

vi.mock("node:fs/promises", async (original) => {
  const actual = await original<typeof import("node:fs/promises")>();
  return { ...actual, rename: vi.fn(actual.rename) };
});
afterEach(() => vi.mocked(rename).mockClear());

it("retries temporary replacement locks and preserves save ordering", async () => {
  const dir = await mkdtemp(join(tmpdir(), "openscratch-store-"));
  try {
    const file = join(dir, "workspace.json");
    const store = new StateStore(file);
    const first = initialState();
    await store.save(first);
    vi.mocked(rename).mockRejectedValueOnce(
      Object.assign(new Error("locked"), { code: "EPERM" }),
    );
    vi.mocked(rename).mockRejectedValueOnce(
      Object.assign(new Error("busy"), { code: "EBUSY" }),
    );
    const second = structuredClone(first);
    second.tabs[0].code = "latest";
    await Promise.all([store.save(first), store.save(second)]);
    expect((await store.load()).tabs[0].code).toBe("latest");
    expect(vi.mocked(rename)).toHaveBeenCalledTimes(5);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

it("reports permanent failures without removing the previous workspace and recovers", async () => {
  const dir = await mkdtemp(join(tmpdir(), "openscratch-store-"));
  try {
    const file = join(dir, "workspace.json");
    const store = new StateStore(file);
    const state = initialState();
    await store.save(state);
    const previous = await readFile(file, "utf8");
    vi.mocked(rename).mockRejectedValueOnce(
      Object.assign(new Error("disk error"), { code: "EIO" }),
    );
    state.tabs[0].code = "new value";
    await expect(store.save(state)).rejects.toThrow("disk error");
    expect(await readFile(file, "utf8")).toBe(previous);
    await store.save(state);
    expect((await store.load()).tabs[0].code).toBe("new value");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
