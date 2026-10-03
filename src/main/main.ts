import { randomUUID } from "node:crypto";
import { exportLibrary, importLibrary } from "../shared/snippets";
import {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  safeStorage,
  Menu,
  protocol,
  shell,
} from "electron";
import { join, extname, basename } from "node:path";
import { readFile, writeFile, stat } from "node:fs/promises";
import { format } from "prettier";
import { z } from "zod";
import { StateStore } from "./store";
import { Packages } from "./packages";
import { CSharpRunner } from "../runtime/csharp-runner";
import { PythonRunner } from "../runtime/python-runner";
import type { ExecutionEngine } from "../runtime/engine";
import { referenceFor } from "../learning/catalog";
import { NodeRunner } from "../runtime/node-runner";
import { BrowserRunner } from "./browser-runner";
import {
  runSchema,
  stateSchema,
  tabSchema,
  languageSchema,
  type RunEvent,
} from "../shared/contracts";
import { translate, type Locale } from "../shared/i18n";
import { validEvent } from "../shared/wire";
if (process.env.OPENSCRATCH_DATA)
  app.setPath("userData", process.env.OPENSCRATCH_DATA);
protocol.registerSchemesAsPrivileged([
  {
    scheme: "scratch",
    privileges: { standard: true, secure: true, supportFetchAPI: true },
  },
]);
let quitting = false;
app
  .whenReady()
  .then(async () => {
    const root = app.getPath("userData");
    const workspace = join(root, "dependencies");
    const secrets =
      safeStorage.isEncryptionAvailable() &&
      safeStorage.getSelectedStorageBackend?.() !== "basic_text"
        ? {
            encrypt: (v: string) =>
              safeStorage.encryptString(v).toString("base64"),
            decrypt: (v: string) =>
              safeStorage.decryptString(Buffer.from(v, "base64")),
          }
        : undefined;
    const store = new StateStore(join(root, "workspace.json"), secrets);
    const window = new BrowserWindow({
      width: 1440,
      height: 930,
      minWidth: 900,
      minHeight: 650,
      backgroundColor: "#111318",
      title: "OpenScratch",
      icon: join(app.getAppPath(), "assets", "icon.png"),
      webPreferences: {
        preload: join(__dirname, "preload.cjs"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
      },
    });
    let menuLocale: Locale | undefined;
    const updateMenu = (locale: Locale) => {
      if (menuLocale === locale) return;
      menuLocale = locale;
      const t = (text: string) => translate(locale, text);
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          {
            label: "OpenScratch",
            submenu: [{ role: "quit", label: t("Quit") }],
          },
          {
            label: t("Edit"),
            submenu: [
              { role: "undo", label: t("Undo") },
              { role: "redo", label: t("Redo") },
              { type: "separator" },
              { role: "cut", label: t("Cut") },
              { role: "copy", label: t("Copy") },
              { role: "paste", label: t("Paste") },
              { role: "selectAll", label: t("Select all") },
            ],
          },
          {
            label: t("View"),
            submenu: [
              { role: "reload", label: t("Reload") },
              { role: "toggleDevTools", label: t("Developer tools") },
              { role: "resetZoom", label: t("Actual size") },
              { role: "zoomIn", label: t("Zoom in") },
              { role: "zoomOut", label: t("Zoom out") },
            ],
          },
        ]),
      );
    };
    updateMenu("en");
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", (e) => e.preventDefault());
    const emit = (event: RunEvent) => {
      if (!window.isDestroyed()) window.webContents.send("run:event", event);
    };
    const packages = new Packages(
      workspace,
      (text) => {
        if (!window.isDestroyed())
          window.webContents.send("packages:log", text);
      },
      join(app.isPackaged ? process.resourcesPath : __dirname, "types"),
      app.isPackaged
        ? join(process.resourcesPath, "npm", "bin", "npm-cli.js")
        : undefined,
    );
    await packages.init();
    const node = new NodeRunner(workspace, join(__dirname, "worker.cjs"), emit);
    const browser = new BrowserRunner(window, workspace, __dirname, emit);
    const python = new PythonRunner(workspace, emit);
    const dotnet = new CSharpRunner(workspace, emit);
    const engines: Record<
      "node" | "browser" | "python" | "dotnet",
      ExecutionEngine
    > = {
      node,
      browser,
      python,
      dotnet,
    };
    let requestGeneration = 0;
    const handle = (name: string, listener: (...args: unknown[]) => unknown) =>
      ipcMain.handle(name, (event, ...args: unknown[]) => {
        if (
          event.sender !== window.webContents ||
          event.senderFrame !== window.webContents.mainFrame
        )
          throw new Error("Untrusted IPC sender");
        return listener(...args);
      });
    handle("reference:open", (id) => {
      const url = referenceFor(z.string().max(100).parse(id));
      if (!url) throw new Error("Unknown reference");
      return shell.openExternal(url);
    });
    handle("state:load", async () => {
      const state = await store.load();
      updateMenu(state.settings.locale);
      return state;
    });
    handle("state:save", (payload) => {
      const state = stateSchema.parse(payload);
      updateMenu(state.settings.locale);
      return store.save(state);
    });
    handle("run", async (payload) => {
      const request = runSchema.parse(payload);
      const generation = ++requestGeneration;
      browser.stop();
      await Promise.all([node.stop(), python.stop(), dotnet.stop()]);
      if (generation !== requestGeneration) return;
      if (
        (request.tab.language === "py") !==
          (request.tab.runtime === "python") ||
        (request.tab.language === "cs") !== (request.tab.runtime === "dotnet")
      )
        throw new Error(
          "Choose the runtime matching the language: Python, .NET for C#, or Node/Browser for JS/TS.",
        );
      await engines[request.tab.runtime].run(request);
    });
    handle("stop", async () => {
      requestGeneration++;
      browser.stop();
      await Promise.all([node.stop(), python.stop(), dotnet.stop()]);
    });
    handle("format", (code, language, options) => {
      if (["py", "cs"].includes(languageSchema.parse(language)))
        throw new Error(
          "Formatting is currently available for JavaScript and TypeScript only.",
        );
      const settings = z
        .object({
          semi: z.boolean(),
          singleQuote: z.boolean(),
          tabSize: z.number().int().min(1).max(8),
        })
        .parse(options);
      return format(z.string().max(2_000_000).parse(code), {
        parser: ["ts", "tsx"].includes(languageSchema.parse(language))
          ? "typescript"
          : "babel",
        semi: settings.semi,
        singleQuote: settings.singleQuote,
        tabWidth: settings.tabSize,
      });
    });
    handle("snippets:import", async () => {
      const result = await dialog.showOpenDialog(window, {
        filters: [{ name: "OpenScratch snippets", extensions: ["json"] }],
        properties: ["openFile"],
      });
      if (result.canceled) return null;
      const file = result.filePaths[0];
      if ((await stat(file)).size > 8_000_000)
        throw new Error("Snippet library exceeds 8 MB");
      return importLibrary(await readFile(file, "utf8"), randomUUID);
    });
    handle("snippets:export", async (payload) => {
      const text = exportLibrary(z.array(tabSchema).max(1000).parse(payload));
      const result = await dialog.showSaveDialog(window, {
        defaultPath: "openscratch-snippets.json",
        filters: [{ name: "JSON", extensions: ["json"] }],
      });
      if (!result.canceled && result.filePath)
        await writeFile(result.filePath, text, "utf8");
    });
    handle("file:import", async () => {
      const result = await dialog.showOpenDialog(window, {
        filters: [
          {
            name: "JavaScript / TypeScript / Python / C#",
            extensions: ["js", "ts", "jsx", "tsx", "py", "cs"],
          },
        ],
        properties: ["openFile"],
      });
      if (result.canceled) return null;
      const file = result.filePaths[0];
      return {
        name: basename(file),
        code: await readFile(file, "utf8"),
        language: languageSchema.parse(extname(file).slice(1)),
      };
    });
    handle("file:export", async (payload) => {
      const tab = tabSchema.parse(payload);
      const result = await dialog.showSaveDialog(window, {
        defaultPath: `${tab.name.replace(/\.(js|ts|jsx|tsx|py|cs)$/, "")}.${tab.language}`,
      });
      if (!result.canceled && result.filePath)
        await writeFile(result.filePath, tab.code);
    });
    handle("packages", async (action, name, version, scripts) => {
      const operation = z
        .enum(["list", "search", "install", "remove"])
        .parse(action);
      if (operation === "list") return packages.list();
      const packageName = z.string().max(200).parse(name);
      if (operation === "search") return packages.search(packageName);
      return packages.change(
        operation,
        packageName,
        z
          .string()
          .max(100)
          .parse(version ?? "latest"),
        z.boolean().parse(scripts ?? false),
      );
    });
    handle("types", () => packages.types());
    handle("preview:bounds", (bounds) =>
      browser.setBounds(
        z
          .object({
            x: z.number().min(0).max(10000),
            y: z.number().min(0).max(10000),
            width: z.number().min(0).max(10000),
            height: z.number().min(0).max(10000),
            visible: z.boolean(),
          })
          .parse(bounds),
      ),
    );
    let browserOutput = 0;
    let lastSender = 0;
    ipcMain.on("preview:output", (event, payload: unknown) => {
      if (event.sender !== browser.view?.webContents || !validEvent(payload))
        return;
      if (lastSender !== event.sender.id) {
        lastSender = event.sender.id;
        browserOutput = 0;
      }
      if (browserOutput++ > 10001) return;
      try {
        const text = JSON.stringify(payload);
        if (text.length > 1_000_000) return;
        const parsed = z
          .object({
            kind: z.literal("output"),
            runId: z.string().uuid(),
            level: z.string().max(20),
            line: z.number().optional(),
            column: z.number().optional(),
            generated: z.boolean().optional(),
            values: z
              .array(
                z.object({
                  type: z.string(),
                  preview: z.string(),
                  entries: z.array(z.unknown()).optional(),
                  id: z.number().optional(),
                  truncated: z.boolean().optional(),
                }),
              )
              .max(20),
          })
          .parse(payload);
        if (parsed.generated && parsed.line)
          parsed.line = browser.originalLine(parsed.line, parsed.column);
        emit(parsed as RunEvent);
      } catch {
        /* Invalid untrusted output is dropped. */
      }
    });
    const dev = process.env.OPENSCRATCH_DEV;
    if (dev === "http://127.0.0.1:5173") await window.loadURL(dev);
    else await window.loadFile(join(__dirname, "ui", "index.html"));
    app.on("before-quit", (event) => {
      if (quitting) return;
      event.preventDefault();
      quitting = true;
      requestGeneration++;
      browser.stop();
      void Promise.all([
        node.stop(),
        python.stop(),
        dotnet.stop(),
        packages.stop(),
        store.flush(),
      ]).finally(() => app.quit());
    });
    window.on("close", () => {
      requestGeneration++;
      browser.stop();
      void node.stop();
      void python.stop();
      void dotnet.stop();
      void packages.stop();
    });
  })
  .catch((error) => {
    console.error("OpenScratch startup failed:", error);
    app.exit(1);
  });
app.on("window-all-closed", () => app.quit());
