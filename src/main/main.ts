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
import { readFile, writeFile } from "node:fs/promises";
import { format } from "prettier";
import { z } from "zod";
import { StateStore } from "./store";
import { Packages } from "./packages";
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
    Menu.setApplicationMenu(
      Menu.buildFromTemplate([
        { label: "OpenScratch", submenu: [{ role: "quit" }] },
        {
          label: "Edit",
          submenu: [
            { role: "undo" },
            { role: "redo" },
            { type: "separator" },
            { role: "cut" },
            { role: "copy" },
            { role: "paste" },
            { role: "selectAll" },
          ],
        },
        {
          label: "View",
          submenu: [
            { role: "reload" },
            { role: "toggleDevTools" },
            { role: "resetZoom" },
            { role: "zoomIn" },
            { role: "zoomOut" },
          ],
        },
      ]),
    );
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
    const engines: Record<"node" | "browser" | "python", ExecutionEngine> = {
      node,
      browser,
      python,
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
    handle("state:load", () => store.load());
    handle("state:save", (state) => store.save(stateSchema.parse(state)));
    handle("run", async (payload) => {
      const request = runSchema.parse(payload);
      const generation = ++requestGeneration;
      browser.stop();
      await Promise.all([node.stop(), python.stop()]);
      if (generation !== requestGeneration) return;
      if (
        (request.tab.language === "py") !==
        (request.tab.runtime === "python")
      )
        throw new Error(
          "Python requires the Python runtime; JavaScript/TypeScript require Node or Browser.",
        );
      await engines[request.tab.runtime].run(request);
    });
    handle("stop", async () => {
      requestGeneration++;
      browser.stop();
      await Promise.all([node.stop(), python.stop()]);
    });
    handle("format", (code, language, options) => {
      if (languageSchema.parse(language) === "py")
        throw new Error("Python formatting is not available yet.");
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
    handle("file:import", async () => {
      const result = await dialog.showOpenDialog(window, {
        filters: [
          {
            name: "JavaScript / TypeScript / Python",
            extensions: ["js", "ts", "jsx", "tsx", "py"],
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
        defaultPath: `${tab.name.replace(/\.(js|ts|jsx|tsx|py)$/, "")}.${tab.language}`,
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
        packages.stop(),
        store.flush(),
      ]).finally(() => app.quit());
    });
    window.on("close", () => {
      requestGeneration++;
      browser.stop();
      void node.stop();
      void python.stop();
      void packages.stop();
    });
  })
  .catch((error) => {
    console.error("OpenScratch startup failed:", error);
    app.exit(1);
  });
app.on("window-all-closed", () => app.quit());
