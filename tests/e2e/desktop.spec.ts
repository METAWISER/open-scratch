import {
  test,
  expect,
  _electron as electron,
  type ElectronApplication,
  type Page,
} from "@playwright/test";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
let app: ElectronApplication, page: Page, directory: string;
test.beforeAll(async () => {
  directory = await mkdtemp(join(tmpdir(), "openscratch-e2e-"));
  app = await electron.launch({
    executablePath: process.env.OPENSCRATCH_TEST_EXECUTABLE,
    args: process.env.OPENSCRATCH_TEST_EXECUTABLE ? [] : ["."],
    env: { ...process.env, OPENSCRATCH_DATA: directory },
  });
  page = await app.firstWindow();
  await expect(
    page.getByRole("button", { name: "▶ Run", exact: true }),
  ).toBeEnabled();
});
test.afterAll(async () => {
  await app?.close();
  await rm(directory, {
    recursive: true,
    force: true,
    maxRetries: 5,
    retryDelay: 200,
  });
});
test.afterEach(async ({ browserName: _browserName }, info) => {
  if (info.status !== info.expectedStatus && page && !page.isClosed()) {
    await info.attach("application-state", {
      body: await page.locator("body").innerText(),
      contentType: "text/plain",
    });
    console.log((await page.locator("body").innerText()).slice(0, 6000));
  }
});
async function code(text: string) {
  const area = page.locator(".monaco-editor textarea").first();
  await area.focus();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.insertText(text);
  await expect
    .poll(async () => {
      const state = await page.evaluate(() => window.openscratch.load());
      return state.tabs
        .find((t) => t.id === state.active)
        ?.code.replaceAll("\r\n", "\n");
    })
    .toBe(text);
}
test("desktop editor, diagnostics, execution, Stop, snippets and persistence", async () => {
  await code('const value: number = "type error does not block";\n1 + 2');
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("3");
  await expect(page.locator("footer")).toContainText("1 type errors");
  await code("while (true) {}");
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await page.getByRole("button", { name: "■ Stop", exact: true }).click();
  await code("42");
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("42");
  await page
    .getByTestId("editor")
    .click({ button: "right", position: { x: 180, y: 70 } });
  await page.getByRole("menuitem", { name: /^Save snippet/ }).click();
  await expect
    .poll(
      async () =>
        JSON.parse(await readFile(join(directory, "workspace.json"), "utf8"))
          .snippets.length,
    )
    .toBe(1);
  await page.getByRole("button", { name: "Snippets", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByRole("textbox", { name: "Rename Welcome" }),
  ).toHaveValue("Welcome");
  await page.getByRole("button", { name: "✕", exact: true }).click();
  await app.close();
  app = await electron.launch({
    executablePath: process.env.OPENSCRATCH_TEST_EXECUTABLE,
    args: process.env.OPENSCRATCH_TEST_EXECUTABLE ? [] : ["."],
    env: { ...process.env, OPENSCRATCH_DATA: directory },
  });
  page = await app.firstWindow();
  await expect(
    page.getByRole("button", { name: "▶ Run", exact: true }),
  ).toBeEnabled();
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("42");
});
test("browser renders DOM without the privileged bridge and cancels an infinite loop", async () => {
  await page.getByLabel("Runtime", { exact: true }).selectOption("browser");
  await code(
    'document.getElementById("root").innerHTML = "<h1>Browser works</h1>";\nconsole.log(typeof window.openscratch, typeof require);',
  );
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("undefined");
  await expect(
    page
      .locator(".output-row")
      .filter({ hasText: "undefined" })
      .locator(".source-line"),
  ).toHaveText("2");
  await expect
    .poll(() =>
      app.evaluate(({ webContents }) =>
        webContents
          .getAllWebContents()
          .find((w) => w.getURL().startsWith("scratch:"))
          ?.executeJavaScript("document.body.innerText"),
      ),
    )
    .toContain("Browser works");
  await code('console.log("loop started"); while(true){}');
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("loop started");
  await page.getByRole("button", { name: "■ Stop", exact: true }).click();
  await code('document.body.textContent="Recovered"');
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect
    .poll(() =>
      app.evaluate(({ webContents }) =>
        webContents
          .getAllWebContents()
          .find((w) => w.getURL().startsWith("scratch:"))
          ?.executeJavaScript("document.body.innerText"),
      ),
    )
    .toContain("Recovered");
});
test("installs a real npm package, imports it immediately, loads types and renders React TSX", async () => {
  test.setTimeout(180000);
  await page.getByRole("button", { name: "npm packages", exact: true }).click();
  await page.getByLabel("Package name", { exact: true }).fill("picocolors");
  await page.getByLabel("Package version", { exact: true }).fill("1.1.1");
  await page
    .getByRole("button", { name: "Install / update", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("button", { name: "picocolors 1.1.1", exact: true }),
  ).toBeVisible({ timeout: 60000 });
  await page.getByRole("button", { name: "✕", exact: true }).click();
  await page.getByLabel("Runtime", { exact: true }).selectOption("node");
  await code('import pc from "picocolors";\npc.red("package works")');
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("package works");
  const types = await page.evaluate(() => window.openscratch.types());
  expect(
    types.some(
      (t) => t.path.includes("picocolors") && t.path.endsWith(".d.ts"),
    ),
  ).toBe(true);
  await code('import pc from "picocolors";\npc.re');
  await page.keyboard.press("ControlOrMeta+Space");
  await expect(page.locator(".suggest-widget")).toContainText("red");
  await page.keyboard.press("Escape");
  for (const name of ["react", "react-dom", "@types/react", "@types/react-dom"])
    await page.evaluate(async (name) => {
      await window.openscratch.packages("install", name, "19.3.0");
    }, name);
  await page.getByLabel("Runtime", { exact: true }).selectOption("browser");
  await page.getByLabel("Language", { exact: true }).selectOption("tsx");
  await code(
    'import {createRoot} from "react-dom/client";\ncreateRoot(document.getElementById("root")!).render(<h1>React TSX works</h1>);',
  );
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect
    .poll(() =>
      app.evaluate(({ webContents }) =>
        webContents
          .getAllWebContents()
          .find((w) => w.getURL().startsWith("scratch:"))
          ?.executeJavaScript("document.body.innerText"),
      ),
    )
    .toContain("React TSX works");
  await page.evaluate(() =>
    window.openscratch.packages("remove", "picocolors"),
  );
  expect(
    (await page.evaluate(() => window.openscratch.packages("list"))).some(
      (p) => p.name === "picocolors",
    ),
  ).toBe(false);
  const screenshot = await app.evaluate(async ({ webContents }) =>
    (
      await webContents
        .getAllWebContents()
        .find((w) => w.getURL().startsWith("scratch:"))!
        .capturePage()
    ).toDataURL(),
  );
  await writeFile(
    "test-results/preview.png",
    Buffer.from(screenshot.split(",")[1], "base64"),
  );
});
test("Auto Run replaces active work and core execution works with offline networking", async () => {
  await page.getByLabel("Runtime", { exact: true }).selectOption("node");
  await page.getByLabel("Language", { exact: true }).selectOption("ts");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByLabel("Auto Run", { exact: true }).check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "✕", exact: true })
    .click();
  await code(
    'console.log("OLD_STARTED"); setTimeout(()=>console.log("STALE_RESULT"),1500)',
  );
  await expect(page.getByTestId("output")).toContainText("OLD_STARTED");
  await code('console.log("LATEST_RESULT")');
  await expect(page.getByTestId("output")).toContainText("LATEST_RESULT");
  await new Promise((resolve) => setTimeout(resolve, 1700));
  await expect(page.getByTestId("output")).not.toContainText("STALE_RESULT");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByLabel("Auto Run", { exact: true }).uncheck();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "✕", exact: true })
    .click();
  await app.evaluate(({ session }) =>
    session.defaultSession.enableNetworkEmulation({ offline: true }),
  );
  await code("await Promise.resolve(21 * 2)");
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("42");
});

test("offline learning opens safe example tabs and Python executes and stops", async () => {
  await page.getByLabel("Language", { exact: true }).selectOption("ts");
  await code("const preserved = 123; preserved");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByLabel("Auto Run", { exact: true }).check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "✕", exact: true })
    .click();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByLabel("Search documentation").fill("sumar");
  await expect(
    page.getByRole("heading", { name: "Array.reduce()", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open example in a new tab", exact: true })
    .click();
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await expect(page.getByLabel("Auto Run", { exact: true })).not.toBeChecked();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "✕", exact: true })
    .click();
  expect(
    await page.evaluate(async () =>
      (await window.openscratch.load()).tabs.some((t) =>
        t.code.includes("const preserved = 123"),
      ),
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("60");
  await page.getByLabel("Language", { exact: true }).selectOption("py");
  await expect(page.getByLabel("Runtime", { exact: true })).toHaveValue(
    "python",
  );
  await page
    .getByTestId("editor")
    .click({ button: "right", position: { x: 180, y: 70 } });
  await expect(page.getByRole("menuitem", { name: /^Format/ })).toBeDisabled();
  await page.keyboard.press("Escape");
  await code("import asyncio\nawait asyncio.sleep(0)\nsum([10, 20, 30])");
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("60");
  await code("print('PY_STARTED')\nwhile True: pass");
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("PY_STARTED");
  await page.getByRole("button", { name: "■ Stop", exact: true }).click();
  await code("21 * 2");
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("42");
  const active = await page.evaluate(
    async () => (await window.openscratch.load()).active,
  );
  await app.close();
  app = await electron.launch({
    executablePath: process.env.OPENSCRATCH_TEST_EXECUTABLE,
    args: process.env.OPENSCRATCH_TEST_EXECUTABLE ? [] : ["."],
    env: { ...process.env, OPENSCRATCH_DATA: directory },
  });
  page = await app.firstWindow();
  await expect(page.getByLabel("Language", { exact: true })).toHaveValue("py");
  expect(
    await page.evaluate(async () => (await window.openscratch.load()).active),
  ).toBe(active);
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("42");
  await expect(
    page.evaluate(() =>
      window.openscratch.openReference("https://example.invalid"),
    ),
  ).rejects.toThrow("Unknown reference");
});

test("English and Spanish persist and C# examples open in a safe new tab", async () => {
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page
    .getByLabel("Interface language", { exact: true })
    .selectOption("es");
  await expect(
    page.getByRole("heading", { name: "Preferencias", exact: true }),
  ).toBeVisible();
  expect(
    await app.evaluate(({ Menu }) =>
      Menu.getApplicationMenu()?.items.map((item) => item.label),
    ),
  ).toContain("Editar");
  await page.getByRole("button", { name: "✕", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "▶ Ejecutar", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Lenguaje", { exact: true }).selectOption("cs");
  await expect(page.getByLabel("Motor", { exact: true })).toHaveValue("dotnet");
  await page.getByRole("button", { name: "Aprender", exact: true }).click();
  await page.getByLabel("Buscar documentación").fill("LINQ");
  await expect(
    page.getByRole("heading", {
      name: "LINQ: Where, Select y Sum",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Copiar", exact: true }).click();
  await expect
    .poll(() => app.evaluate(({ clipboard }) => clipboard.readText()))
    .toContain("Console.WriteLine(total)");
  await page
    .getByRole("button", {
      name: "Abrir ejemplo en una pestaña: LINQ: Where, Select y Sum",
      exact: true,
    })
    .click();
  await page.getByRole("button", { name: "Preferencias", exact: true }).click();
  await expect(
    page.getByLabel("Ejecución automática", { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByLabel("Registro automático", { exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "✕", exact: true })
    .click();
  await page.getByRole("button", { name: "▶ Ejecutar", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("12", {
    timeout: 45000,
  });
  await expect(page.locator("footer")).toContainText("Listo");
  await app.close();
  app = await electron.launch({
    executablePath: process.env.OPENSCRATCH_TEST_EXECUTABLE,
    args: process.env.OPENSCRATCH_TEST_EXECUTABLE ? [] : ["."],
    env: { ...process.env, OPENSCRATCH_DATA: directory },
  });
  page = await app.firstWindow();
  await expect(page.getByLabel("Lenguaje", { exact: true })).toHaveValue("cs");
  await page.getByRole("button", { name: "Preferencias", exact: true }).click();
  await page
    .getByLabel("Idioma de la interfaz", { exact: true })
    .selectOption("en");
  await page.getByRole("button", { name: "✕", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "▶ Run", exact: true }),
  ).toBeVisible();
});

test("sidebar, language picker, editor actions and popular package installation", async () => {
  test.setTimeout(120000);
  await expect(
    page
      .locator(".activity-bar")
      .getByRole("button", { name: "▶ Run", exact: true }),
  ).toBeVisible();
  for (const [name, language, runtime] of [
    ["Python", "py", "python"],
    ["C#", "cs", "dotnet"],
    ["JSX", "jsx", "browser"],
    ["TSX", "tsx", "browser"],
    ["TypeScript", "ts", "node"],
    ["JavaScript", "js", "node"],
  ]) {
    await page.getByTitle("New tab", { exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", {
        name: new RegExp(`^${name.replace("#", "\\#")}\\s`),
      })
      .click();
    await expect
      .poll(async () => {
        const state = await page.evaluate(() => window.openscratch.load());
        const tab = state.tabs.find((t) => t.id === state.active)!;
        return [tab.language, tab.runtime];
      })
      .toEqual([language, runtime]);
  }
  await code("const items=[1,2,3];items.map(x=>x*2)");
  await page
    .getByTestId("editor")
    .click({ button: "right", position: { x: 180, y: 70 } });
  const menu = page.getByRole("menu", { name: "Editor actions" });
  await expect(menu).not.toContainText("Change All Occurrences");
  await menu.getByRole("menuitem", { name: /^Format/ }).click();
  await expect
    .poll(async () => {
      const state = await page.evaluate(() => window.openscratch.load());
      return state.tabs.find((t) => t.id === state.active)!.code;
    })
    .toContain("const items = [1, 2, 3]");
  await page
    .getByTestId("editor")
    .click({ button: "right", position: { x: 180, y: 70 } });
  await menu.getByRole("menuitem", { name: /^Save snippet/ }).click();
  await expect
    .poll(async () => {
      const state = await page.evaluate(() => window.openscratch.load());
      return state.snippets.some((t) => t.id === state.active);
    })
    .toBe(true);
  await page.getByRole("button", { name: "npm packages", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Popular packages" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Install date-fns", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Installed date-fns", exact: true }),
  ).toBeDisabled({ timeout: 60000 });
  const installed = await page.evaluate(() =>
    window.openscratch.packages("list"),
  );
  expect(installed.some((p) => p.name === "date-fns")).toBe(true);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "✕", exact: true })
    .click();
  await code(
    "import { format } from 'date-fns'; format(new Date(2024, 0, 2), 'yyyy-MM-dd')",
  );
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.locator(".results-pane")).toContainText("2024-01-02", {
    timeout: 30000,
  });
  await page.screenshot({ path: "test-results/sidebar-final.png" });
  await page.evaluate(() => window.openscratch.packages("remove", "date-fns"));
});

test("reusable snippets, editor preferences and output inspection", async () => {
  await page.getByTitle("New tab", { exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "JavaScript Node.js", exact: true })
    .click();
  await code("// keep outside selection\nconst reusable = 42;");
  await page.locator(".monaco-editor textarea").first().focus();
  await page.keyboard.press("ControlOrMeta+End");
  await page.keyboard.press("Home");
  await page.keyboard.press("Shift+End");
  await page.keyboard.press("ControlOrMeta+s");
  await expect
    .poll(async () =>
      (await page.evaluate(() => window.openscratch.load())).snippets.some(
        (s) => s.code === "const reusable = 42;",
      ),
    )
    .toBe(true);
  await page.getByRole("button", { name: "Snippets", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Search snippets")
    .fill("const reusable");
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: /^Rename / })
    .fill("reuseAnswer");
  await page
    .getByRole("dialog")
    .getByRole("textbox", { name: "Description reuseAnswer", exact: true })
    .fill("Reusable answer helper");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "✕", exact: true })
    .click();
  await code("reuseAns");
  await page.keyboard.press("ControlOrMeta+Space");
  await expect(page.locator(".suggest-widget")).toContainText("reuseAnswer");
  await page.keyboard.press("Escape");
  await code("// inserted below\n");
  await page.getByRole("button", { name: "Snippets", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Search snippets")
    .fill("reuseAnswer");
  await page
    .getByRole("button", { name: "Insert at cursor", exact: true })
    .click();
  await expect
    .poll(async () => {
      const s = await page.evaluate(() => window.openscratch.load());
      return s.tabs
        .find((t) => t.id === s.active)!
        .code.replaceAll("\r\n", "\n");
    })
    .toBe("// inserted below\nconst reusable = 42;");
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByText("Editor and output", { exact: true }).click();
  await page.getByLabel("Show undefined results", { exact: true }).uncheck();
  await page.getByLabel("Line numbers", { exact: true }).uncheck();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "✕", exact: true })
    .click();
  await code("undefined;\n({ nested: { answer: 42 } });");
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.locator(".output-row")).toHaveCount(1);
  await page.getByRole("button", { name: "Expand all", exact: true }).click();
  await expect
    .poll(() => page.locator(".console details:not([open])").count())
    .toBe(0);
  await expect(
    page.locator(".console .property-name").filter({ hasText: "answer" }),
  ).toBeVisible();
  await page.locator(".output-row").hover();
  await expect(page.locator(".output-source-highlight")).toBeVisible();
  await page.getByRole("button", { name: "Collapse all", exact: true }).click();
  await expect(page.locator(".console details[open]")).toHaveCount(0);
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByText("Editor and output", { exact: true }).click();
  await expect(
    page.getByLabel("Line numbers", { exact: true }),
  ).not.toBeChecked();
  await page.getByLabel("Line numbers", { exact: true }).check();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "✕", exact: true })
    .click();
  const exportPath = join(directory, "library.json");
  await app.evaluate(({ dialog }, filePath) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath });
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: [filePath],
    });
  }, exportPath);
  await page.getByRole("button", { name: "Snippets", exact: true }).click();
  await page
    .getByRole("button", { name: "Export library", exact: true })
    .click();
  await expect
    .poll(async () => {
      try {
        return JSON.parse(await readFile(exportPath, "utf8")).format;
      } catch {
        return "";
      }
    })
    .toBe("openscratch-snippets");
  const exported = JSON.parse(await readFile(exportPath, "utf8"));
  expect(
    exported.snippets.some(
      (snippet: { description: string }) =>
        snippet.description === "Reusable answer helper",
    ),
  ).toBe(true);
  const before = (await page.evaluate(() => window.openscratch.load())).snippets
    .length;
  await page
    .getByRole("button", { name: "Import library", exact: true })
    .click();
  await expect
    .poll(
      async () =>
        (await page.evaluate(() => window.openscratch.load())).snippets.length,
    )
    .toBe(before + exported.snippets.length);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "✕", exact: true })
    .click();
  await page.screenshot({ path: "test-results/parity-output.png" });
});

test("Browser loads local stylesheets and keeps source locations and bridge isolation", async () => {
  await writeFile(
    join(directory, "colors.css"),
    "#root { color: rgb(12, 34, 56); }",
  );
  await writeFile(
    join(directory, "styles.css"),
    '@import "./colors.css"; #root { font-size: 23px; }',
  );
  await page.getByRole("button", { name: "Preferences", exact: true }).click();
  await page.getByRole("button", { name: "Tab settings", exact: true }).click();
  await page.getByLabel("Working directory", { exact: true }).fill(directory);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "✕", exact: true })
    .click();
  await page.getByLabel("Runtime", { exact: true }).selectOption("browser");
  await code(
    'import "./styles.css";\nconsole.log(getComputedStyle(document.getElementById("root")).color);\nconsole.log(typeof window.openscratch);',
  );
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("rgb(12, 34, 56)");
  await expect(page.getByTestId("output")).toContainText("undefined");
  await expect(
    page
      .locator(".output-row")
      .filter({ hasText: "rgb(12, 34, 56)" })
      .locator(".source-line"),
  ).toHaveText("2");
});
