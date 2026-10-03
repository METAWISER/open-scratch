import { it, expect } from "vitest";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
const script = resolve("scripts/release-notes.mjs");
it("requires matching version/tag and complete release notes without publishing", async () => {
  const root = await mkdtemp(join(tmpdir(), "openscratch-release-"));
  try {
    await writeFile(
      join(root, "package.json"),
      JSON.stringify({ version: "1.2.3" }),
    );
    await writeFile(
      join(root, "CHANGELOG.md"),
      "# Changelog\n\n## [1.2.3]\n\n- Added a useful feature.\n\n## [1.2.2]\n- Old change.",
    );
    const run = (tag: string) =>
      execFileSync(process.execPath, [script], {
        cwd: root,
        env: { ...process.env, RELEASE_TAG: tag },
        stdio: "pipe",
      });
    expect(() => run("v1.2.4")).toThrow();
    run("v1.2.3");
    const notes = await readFile(join(root, "release-meta/notes.md"), "utf8");
    expect(notes).toContain("Added a useful feature");
    expect(notes).not.toContain("Old change");
    expect(
      JSON.parse(
        await readFile(join(root, "release-meta/version.json"), "utf8"),
      ),
    ).toEqual({ tag: "v1.2.3", version: "1.2.3", prerelease: false });
    await writeFile(join(root, "CHANGELOG.md"), "## [1.2.3]\nTODO");
    expect(() => run("v1.2.3")).toThrow();
    await writeFile(join(root, "CHANGELOG.md"), "## [1.2.2]\n- Other release");
    expect(() => run("v1.2.3")).toThrow();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
