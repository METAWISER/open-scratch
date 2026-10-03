import { readFile, writeFile, mkdir } from "node:fs/promises";
const { version } = JSON.parse(await readFile("package.json", "utf8"));
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/.test(version))
  throw new Error("Invalid release version");
const tag = process.env.RELEASE_TAG || `v${version}`;
if (tag !== `v${version}`)
  throw new Error("Release tag must match package.json version");
const changelog = await readFile("CHANGELOG.md", "utf8");
const lines = changelog.split(/\r?\n/);
const start = lines.findIndex(
  (line) => line === `## [${version}]` || line.startsWith(`## [${version}] - `),
);
if (start < 0) throw new Error("Missing CHANGELOG entry for release version");
let end = lines.findIndex(
  (line, index) => index > start && line.startsWith("## "),
);
if (end < 0) end = lines.length;
const notes = lines
  .slice(start + 1, end)
  .join("\n")
  .trim();
if (!notes || /\b(?:TODO|TBD)\b/.test(notes))
  throw new Error("Release notes must be complete");
await mkdir("release-meta", { recursive: true });
await writeFile(
  "release-meta/notes.md",
  `# OpenScratch ${version}\n\n${notes}\n\n## Downloads\n\nWindows x64 installer attached. This build is unsigned; installer UI and signing are not certified. Python and C# require separate Python/.NET installations. See SHA256SUMS.txt to verify the downloaded installer. macOS/Linux installers are not included in this release workflow.\n`,
);
await writeFile(
  "release-meta/version.json",
  JSON.stringify({ tag, version, prerelease: version.includes("-") }, null, 2),
);
console.log(
  `Validated ${tag} and generated release notes. No release was published.`,
);
