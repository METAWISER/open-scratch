import { WebContentsView, BrowserWindow, session } from "electron";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { SourceMap } from "node:module";
import type { RunRequest, RunEvent } from "../shared/contracts";
import { compile } from "../compiler/compile";
export class BrowserRunner {
  view?: WebContentsView;
  private generation = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private runId?: string;
  private map?: SourceMap;
  originalLine(line: number, column = 1) {
    const entry = this.map?.findEntry(line - 1, column - 1);
    return entry && "originalLine" in entry ? entry.originalLine + 1 : line;
  }
  private bounds = { x: 700, y: 400, width: 500, height: 300, visible: true };
  constructor(
    private owner: BrowserWindow,
    private workspace: string,
    private dist: string,
    private emit: (e: RunEvent) => void,
  ) {}
  setBounds(bounds: typeof this.bounds) {
    this.bounds = bounds;
    this.view?.setBounds({
      x: Math.round(bounds.x),
      y: Math.round(bounds.y),
      width: Math.max(1, Math.round(bounds.width)),
      height: Math.max(1, Math.round(bounds.height)),
    });
    this.view?.setVisible(bounds.visible);
  }
  stop() {
    this.generation++;
    clearTimeout(this.timer);
    if (this.view) {
      this.owner.contentView.removeChildView(this.view);
      this.view.webContents.close({ waitForBeforeUnload: false });
      this.view = undefined;
    }
    if (this.runId)
      this.emit({ kind: "status", runId: this.runId, status: "stopped" });
    this.runId = undefined;
  }
  async run(request: RunRequest) {
    this.stop();
    const generation = ++this.generation;
    this.runId = request.runId;
    this.emit({ kind: "status", runId: request.runId, status: "running" });
    try {
      const code = await compile(request, this.workspace);
      const bootstrap = await readFile(
        join(this.dist, "browser-bootstrap.js"),
        "utf8",
      );
      if (generation !== this.generation) return;
      const marker = "sourceMappingURL=data:application/json;base64,";
      const encoded = code
        .slice(code.lastIndexOf(marker) + marker.length)
        .trim();
      this.map = new SourceMap(
        JSON.parse(Buffer.from(encoded, "base64").toString("utf8")),
      );
      const partition = `scratch-${request.runId}`;
      const ses = session.fromPartition(partition);
      ses.setPermissionRequestHandler((_wc, _permission, callback) =>
        callback(false),
      );
      ses.setPermissionCheckHandler(() => false);
      ses.webRequest.onBeforeRequest((details, callback) =>
        callback({
          cancel: ![
            "scratch:",
            "data:",
            "https:",
            "http:",
            "blob:",
            "about:",
            "ws:",
            "wss:",
          ].some((s) => details.url.startsWith(s)),
        }),
      );
      const view = new WebContentsView({
        webPreferences: {
          preload: join(this.dist, "browser-preload.cjs"),
          partition,
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
        },
      });
      this.view = view;
      view.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      view.webContents.on("will-navigate", (e) => e.preventDefault());
      this.owner.contentView.addChildView(view);
      this.setBounds(this.bounds);
      const escape = (s: string) => s.replaceAll("</script", "<\\/script");
      const html = `<!doctype html><meta charset="utf-8"><div id="root"></div><script>window.__runConfig=${JSON.stringify({ runId: request.runId, ...request.limits })}</script><script>${escape(bootstrap)}</script><script type="module" src="./entry.js"></script>`;
      ses.protocol.handle("scratch", (req) => {
        const url = new URL(req.url);
        if (url.host !== request.runId)
          return new Response("Not found", { status: 404 });
        if (url.pathname === "/entry.js")
          return new Response(code + "\n//# sourceURL=openscratch-user.js\n", {
            headers: { "content-type": "text/javascript" },
          });
        if (url.pathname === "/index.html")
          return new Response(html, {
            headers: { "content-type": "text/html" },
          });
        return new Response("Not found", { status: 404 });
      });
      view.webContents.once("destroyed", () => {
        ses.protocol.unhandle("scratch");
        void ses.clearStorageData();
      });
      if (request.limits.timeout)
        this.timer = setTimeout(() => this.stop(), request.limits.timeout);
      await view.webContents.loadURL(`scratch://${request.runId}/index.html`);
      if (generation === this.generation)
        this.emit({ kind: "status", runId: request.runId, status: "idle" });
    } catch (error) {
      if (generation === this.generation)
        this.emit({
          kind: "status",
          runId: request.runId,
          status: "error",
          message: String(error),
        });
    }
  }
}
