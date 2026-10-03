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
  await page.getByRole("button", { name: "Save snippet", exact: true }).click();
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
  await page.screenshot({ path: "test-results/desktop.png" });
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
  await page.screenshot({ path: "test-results/react-preview.png" });
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
  await page.getByLabel("Auto Run", { exact: true }).check();
  await code(
    'console.log("OLD_STARTED"); setTimeout(()=>console.log("STALE_RESULT"),1500)',
  );
  await expect(page.getByTestId("output")).toContainText("OLD_STARTED");
  await code('console.log("LATEST_RESULT")');
  await expect(page.getByTestId("output")).toContainText("LATEST_RESULT");
  await new Promise((resolve) => setTimeout(resolve, 1700));
  await expect(page.getByTestId("output")).not.toContainText("STALE_RESULT");
  await page.getByLabel("Auto Run", { exact: true }).uncheck();
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
  await page.getByLabel("Auto Run", { exact: true }).check();
  await page.getByRole("button", { name: "Learn", exact: true }).click();
  await page.getByLabel("Search documentation").fill("sumar");
  await expect(
    page.getByRole("heading", { name: "Array.reduce()", exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "test-results/learning.png" });
  await page
    .getByRole("button", { name: "Open example in a new tab", exact: true })
    .click();
  await expect(page.getByLabel("Auto Run", { exact: true })).not.toBeChecked();
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
  await expect(
    page.getByRole("button", { name: "Format", exact: true }),
  ).toBeDisabled();
  await code("import asyncio\nawait asyncio.sleep(0)\nsum([10, 20, 30])");
  await page.getByRole("button", { name: "▶ Run", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("60");
  await page.screenshot({ path: "test-results/python.png" });
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
  await expect(
    page.getByLabel("Ejecución automática", { exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByLabel("Registro automático", { exact: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "▶ Ejecutar", exact: true }).click();
  await expect(page.getByTestId("output")).toContainText("12", {
    timeout: 45000,
  });
  await expect(page.locator("footer")).toContainText("Listo");
  await page.screenshot({ path: "test-results/spanish-csharp.png" });
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
