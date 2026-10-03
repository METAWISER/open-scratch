import { it, expect } from "vitest";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import {
  newTab,
  defaultSettings,
  stateSchema,
  initialState,
} from "../src/shared/contracts";
import { importLibrary, exportLibrary } from "../src/shared/snippets";
import { compileBundle } from "../src/compiler/compile";

it("round-trips portable snippets without credentials, environment or working paths", () => {
  const original = {
    ...newTab("secret-id", "helper"),
    description: "Reusable helper",
    code: "21 * 2",
    env: { SECRET_TOKEN: "do-not-export" },
    cwd: "/private/workspace",
    pythonExecutable: "/private/bin/python",
  };
  const exported = exportLibrary([original]);
  expect(exported).not.toContain("do-not-export");
  expect(exported).not.toContain("/private");
  expect(exported).not.toContain("secret-id");
  const restored = importLibrary(exported, () => "fresh-id")[0];
  expect(restored).toMatchObject({
    id: "fresh-id",
    name: "helper",
    code: "21 * 2",
    description: "Reusable helper",
    env: {},
    cwd: "",
    pythonExecutable: "",
  });
});
it("validates imported libraries and maps all language runtimes", () => {
  for (const [language, runtime] of [
    ["js", "node"],
    ["ts", "node"],
    ["jsx", "browser"],
    ["tsx", "browser"],
    ["py", "python"],
    ["cs", "dotnet"],
  ] as const) {
    const result = importLibrary(
      exportLibrary([{ ...newTab("old"), language }]),
      () => "new",
    );
    expect(result[0].runtime).toBe(runtime);
  }
  expect(() =>
    importLibrary('{"format":"other","version":1,"snippets":[]}', () => "new"),
  ).toThrow();
  expect(() => importLibrary("x".repeat(8_000_001), () => "new")).toThrow(
    "8 MB",
  );
  expect(() =>
    importLibrary(
      JSON.stringify({
        format: "openscratch-snippets",
        version: 1,
        snippets: [{ name: "bad", language: "shell", code: "" }],
      }),
      () => "new",
    ),
  ).toThrow();
});
it("defaults new editor settings and snippet descriptions when reading older state", () => {
  const state = JSON.parse(JSON.stringify(initialState()));
  for (const key of [
    "lineNumbers",
    "fontLigatures",
    "closeBrackets",
    "renderWhitespace",
    "highlightActiveLine",
    "autocomplete",
    "linting",
    "hoverInfo",
    "signatureHelp",
    "showUndefined",
  ])
    delete state.settings[key];
  delete state.tabs[0].description;
  const migrated = stateSchema.parse(state);
  expect(migrated.settings.lineNumbers).toBe(true);
  expect(migrated.settings.renderWhitespace).toBe(false);
  expect(migrated.tabs[0].description).toBe("");
});
it("bundles local CSS imports, nested styles and image URLs without changing JS source maps", async () => {
  const dir = await mkdtemp(join(tmpdir(), "openscratch-css-"));
  try {
    await writeFile(join(dir, "base.css"), "#root { color: rgb(12, 34, 56); }");
    await writeFile(
      join(dir, "icon.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
    );
    await writeFile(
      join(dir, "styles.css"),
      '@import "./base.css"; body { background-image: url("./icon.svg"); }',
    );
    const result = await compileBundle(
      {
        runId: crypto.randomUUID(),
        tab: {
          ...newTab("css"),
          language: "js",
          runtime: "browser",
          cwd: dir,
          code: 'import "./styles.css";\nconsole.log(42);',
        },
        autoLog: false,
        limits: defaultSettings.limits,
      },
      dir,
    );
    expect(result.css).toContain("#root");
    expect(result.css).toContain("data:image/svg+xml");
    expect(result.code).toContain(
      "sourceMappingURL=data:application/json;base64,",
    );
    expect(result.code).not.toContain('import "./styles.css"');
    await expect(
      compileBundle(
        {
          runId: crypto.randomUUID(),
          tab: {
            ...newTab("node-css"),
            cwd: dir,
            code: 'import "./styles.css";',
          },
          autoLog: false,
          limits: defaultSettings.limits,
        },
        dir,
      ),
    ).rejects.toThrow("CSS imports require the Browser runtime");
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
