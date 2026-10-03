import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
const records = new Map();
async function inspect(path) {
  let pkg;
  try {
    pkg = JSON.parse(await readFile(join(path, "package.json"), "utf8"));
  } catch {
    return;
  }
  const id = `${pkg.name}@${pkg.version}`;
  if (records.has(id)) return;
  let license = "";
  for (const name of await readdir(path)) {
    if (/^(licen[cs]e|copying|notice)(\.|$)/i.test(name)) {
      try {
        license += `\n${name}\n${await readFile(join(path, name), "utf8")}\n`;
      } catch {
        /* Directory, not a license file. */
      }
    }
  }
  records.set(id, { license: pkg.license ?? "See package", text: license });
  await nested(join(path, "node_modules"));
}
async function nested(dir) {
  let names;
  try {
    names = await readdir(dir);
  } catch {
    return;
  }
  for (const name of names) {
    if (name.startsWith("@")) {
      for (const entry of await readdir(join(dir, name)))
        await inspect(join(dir, name, entry));
    } else if (!name.startsWith(".")) await inspect(join(dir, name));
  }
}
for (const folder of await readdir("node_modules/.pnpm")) {
  const modules = join("node_modules/.pnpm", folder, "node_modules");
  let names;
  try {
    names = await readdir(modules);
  } catch {
    continue;
  }
  for (const name of names) {
    if (name.startsWith("@")) {
      for (const scoped of await readdir(join(modules, name)))
        await inspect(join(modules, name, scoped));
    } else await inspect(join(modules, name));
  }
}
const text =
  "# Third-party notices\n\nGenerated from the installed lockfile dependency graph (includes build tools). Original OpenScratch code is MIT. Electron distribution also includes LICENSE.electron.txt and LICENSES.chromium.html, which must be retained.\n\n" +
  [...records]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(
      ([id, p]) =>
        `## ${id}\n\nLicense: ${JSON.stringify(p.license)}\n\n\`\`\`text\n${p.text || "Consult the package metadata and upstream repository for full terms."}\n\`\`\`\n`,
    )
    .join("\n");
await writeFile("THIRD_PARTY_NOTICES.md", text);
console.log(`Recorded ${records.size} dependency notices.`);
