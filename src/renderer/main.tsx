import { LocaleContext } from "./i18n";
import { translate } from "../shared/i18n";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type * as Monaco from "monaco-editor";
import {
  initialState,
  newTab,
  type AppState,
  type Tab,
  type RunEvent,
  type Output,
  type Bridge,
  type PackageInfo,
} from "../shared/contracts";
import { Editor, refreshTypes } from "./editor";
import { LearningPanel } from "./LearningPanel";
import { Inspector } from "./Inspector";
import { SnippetLibrary } from "./SnippetLibrary";
import "./style.css";
declare global {
  interface Window {
    openscratch: Bridge;
  }
}
type Modal =
  | "new-tab"
  | "learn"
  | "preferences"
  | "packages"
  | "snippets"
  | "commands"
  | "tab"
  | null;
function RailButton({
  icon,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { icon: string }) {
  const label =
    props["aria-label"] ?? (typeof children === "string" ? children : "");
  return (
    <button {...props} title={label} aria-label={label}>
      <span aria-hidden="true">{icon}</span>
      <span className="sr-only">{children}</span>
    </button>
  );
}
function App() {
  const [state, setState] = useState<AppState>(initialState),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [modal, setModal] = useState<Modal>(null),
    [outputs, setOutputs] = useState<Record<string, Output[]>>({}),
    [status, setStatus] = useState("idle"),
    [diagnostics, setDiagnostics] = useState(0),
    [hoveredLine, setHoveredLine] = useState<number | undefined>(),
    [helpQuery, setHelpQuery] = useState(""),
    [query, setQuery] = useState(""),
    [packages, setPackages] = useState<PackageInfo[]>([]),
    [results, setResults] = useState<PackageInfo[]>([]),
    [packageName, setPackageName] = useState(""),
    [version, setVersion] = useState("latest"),
    [scripts, setScripts] = useState(false),
    [packageLog, setPackageLog] = useState(""),
    [busy, setBusy] = useState(false),
    [split, setSplit] = useState(52);
  const tr = (text: string) => translate(state.settings.locale, text);
  const current = useRef(state);
  current.current = state;
  const activeRun = useRef<{ runId: string; tabId: string } | null>(null),
    editor = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null),
    preview = useRef<HTMLDivElement>(null),
    pending = useRef<Output[]>([]);
  const tab = state.tabs.find((t) => t.id === state.active) ?? state.tabs[0];
  const fail = (e: unknown) => setError(String(e));
  useEffect(() => {
    window.openscratch
      .load()
      .then((s) => {
        setState(s);
        setLoaded(true);
      })
      .catch(fail);
    return window.openscratch.onPackageLog((text) =>
      setPackageLog((s) => (s + text).slice(-20000)),
    );
  }, []);
  useEffect(() => {
    if (loaded) void window.openscratch.save(state).catch(fail);
  }, [state, loaded]);
  useEffect(() => {
    document.documentElement.dataset.theme = state.settings.theme;
    document.documentElement.lang = state.settings.locale;
  }, [state.settings.theme, state.settings.locale]);
  useEffect(() => {
    const flush = setInterval(() => {
      if (!pending.current.length) return;
      const batch = pending.current.splice(0);
      const active = activeRun.current;
      if (!active) return;
      const relevant = batch.filter((e) => e.runId === active.runId);
      if (relevant.length)
        setOutputs((s) => ({
          ...s,
          [active.tabId]: [...(s[active.tabId] ?? []), ...relevant].slice(
            -current.current.settings.limits.output - 1,
          ),
        }));
    }, 40);
    const off = window.openscratch.onEvent((event: RunEvent) => {
      if (event.runId !== activeRun.current?.runId) return;
      if (event.kind === "output") pending.current.push(event);
      else {
        setStatus(event.status);
        if (event.message) setError(event.message);
      }
    });
    return () => {
      clearInterval(flush);
      off();
    };
  }, []);
  const patchTab = (patch: Partial<Tab>) =>
    setState((s) => ({
      ...s,
      tabs: s.tabs.map((t) => (t.id === s.active ? { ...t, ...patch } : t)),
    }));
  const stop = useCallback(() => {
    activeRun.current = null;
    pending.current = [];
    setStatus("stopped");
    void window.openscratch.stop().catch(fail);
  }, []);
  const run = useCallback(async () => {
    const s = current.current;
    const selected = s.tabs.find((t) => t.id === s.active)!;
    const runId = crypto.randomUUID();
    activeRun.current = { runId, tabId: selected.id };
    pending.current = [];
    setOutputs((o) => ({ ...o, [selected.id]: [] }));
    setError("");
    setStatus("running");
    try {
      await window.openscratch.run({
        runId,
        tab: selected,
        autoLog: s.settings.autoLog,
        limits: s.settings.limits,
      });
    } catch (e) {
      if (activeRun.current?.runId === runId) {
        setStatus("error");
        fail(e);
      }
    }
  }, []);
  const codeChanged = useCallback(
    (code: string) => {
      const s = current.current;
      if (s.tabs.find((t) => t.id === s.active)?.code === code) return;
      if (s.settings.autoRun) stop();
      setState((s) => ({
        ...s,
        tabs: s.tabs.map((t) => (t.id === s.active ? { ...t, code } : t)),
      }));
    },
    [stop],
  );
  useEffect(() => {
    if (!loaded || !state.settings.autoRun) return;
    const timer = setTimeout(() => void run(), state.settings.debounce);
    return () => clearTimeout(timer);
  }, [
    tab.code,
    tab.language,
    tab.runtime,
    tab.cwd,
    tab.env,
    tab.logpoints,
    state.active,
    state.settings.autoRun,
    state.settings.autoLog,
    state.settings.debounce,
    loaded,
    run,
  ]);
  const format = useCallback(async () => {
    const s = current.current;
    const t = s.tabs.find((t) => t.id === s.active)!;
    try {
      const code = await window.openscratch.format(
        t.code,
        t.language,
        s.settings,
      );
      setState((s) => ({
        ...s,
        tabs: s.tabs.map((x) => (x.id === t.id ? { ...x, code } : x)),
      }));
    } catch (e) {
      fail(e);
    }
  }, []);
  const add = () => setModal("new-tab");
  const createTab = (language: Tab["language"]) => {
    stop();
    const t = {
      ...newTab(crypto.randomUUID()),
      language,
      code: "",
      runtime: (language === "py"
        ? "python"
        : language === "cs"
          ? "dotnet"
          : ["jsx", "tsx"].includes(language)
            ? "browser"
            : "node") as Tab["runtime"],
    };
    setModal(null);
    setState((s) => ({ ...s, tabs: [...s.tabs, t], active: t.id }));
  };
  const saveSnippet = useCallback(() => {
    const state = current.current;
    const tab = state.tabs.find((t) => t.id === state.active)!;
    const selection = editor.current?.getSelection();
    const selected =
      selection && !selection.isEmpty()
        ? editor.current?.getModel()?.getValueInRange(selection)
        : undefined;
    const snippet = {
      ...tab,
      id: selected ? crypto.randomUUID() : tab.id,
      code: selected ?? tab.code,
      env: {},
      cwd: "",
      logpoints: [],
      pythonExecutable: "",
      dotnetExecutable: "",
    };
    if (
      state.snippets.length >= 1000 &&
      !state.snippets.some((saved) => saved.id === snippet.id)
    ) {
      setError(
        translate(
          state.settings.locale,
          "The library supports up to 1000 snippets.",
        ),
      );
      return;
    }
    setState((s) => ({
      ...s,
      snippets: [...s.snippets.filter((t) => t.id !== snippet.id), snippet],
    }));
  }, []);
  const importFile = async () => {
    try {
      const data = await window.openscratch.importFile();
      if (data) {
        stop();
        const t: Tab = {
          ...newTab(crypto.randomUUID()),
          ...data,
          runtime:
            data.language === "py"
              ? "python"
              : data.language === "cs"
                ? "dotnet"
                : "node",
        };
        setState((s) => ({ ...s, tabs: [...s.tabs, t], active: t.id }));
      }
    } catch (e) {
      fail(e);
    }
  };
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        if (e.shiftKey) stop();
        else void run();
      }
      if (e.key.toLowerCase() === "p" && e.shiftKey) {
        e.preventDefault();
        setModal((m) => (m === "commands" ? null : "commands"));
      }
      if (e.key === "s") {
        e.preventDefault();
        saveSnippet();
      }
      if (e.key === "f" && e.shiftKey) {
        e.preventDefault();
        void format();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [run, stop, format, saveSnippet]);
  useEffect(() => {
    const element = preview.current;
    if (!element) return;
    const update = () => {
      const box = element.getBoundingClientRect();
      void window.openscratch
        .preview({
          x: box.x,
          y: box.y,
          width: box.width,
          height: box.height,
          visible: tab.runtime === "browser" && !modal,
        })
        .catch(fail);
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    window.addEventListener("resize", update);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [tab.runtime, modal, split]);
  const openHelp = () => {
    const position = editor.current?.getPosition();
    const word =
      position && editor.current?.getModel()?.getWordAtPosition(position)?.word;
    setHelpQuery(word ?? "");
    setModal("learn");
  };
  const commands: [string, () => void][] = [
    [tr("Look up the word under the cursor"), openHelp],
    [
      tr("Contribute on GitHub"),
      () => void window.openscratch.openReference("contribute").catch(fail),
    ],
    [tr("Run code · Ctrl/Cmd R"), () => void run()],
    [tr("Stop · Ctrl/Cmd Shift R"), stop],
    [tr("Format · Ctrl/Cmd Shift F"), () => void format()],
    [tr("New tab"), add],
    [tr("Save snippet · Ctrl/Cmd S"), saveSnippet],
    [tr("Import file"), () => void importFile()],
    [
      tr("Export file"),
      () => void window.openscratch.exportFile(tab).catch(fail),
    ],
    [tr("Clear results"), () => setOutputs((s) => ({ ...s, [tab.id]: [] }))],
    [tr("Preferences"), () => setModal("preferences")],
    [
      tr("npm packages"),
      () => {
        setModal("packages");
        void window.openscratch.packages("list").then(setPackages).catch(fail);
      },
    ],
  ];
  const changePackage = async (
    action: "install" | "remove",
    name = packageName,
    v = version,
  ) => {
    setBusy(true);
    setPackageLog("");
    try {
      setPackages(await window.openscratch.packages(action, name, v, scripts));
      await refreshTypes();
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };
  const visibleOutputs = (outputs[tab.id] ?? []).filter(
    (o) =>
      state.settings.showUndefined ||
      o.level !== "result" ||
      o.values.some((v) => v.type !== "undefined"),
  );
  const expandOutput = (open: boolean) =>
    document
      .querySelectorAll<HTMLDetailsElement>(".console details")
      .forEach((d) => {
        d.open = open;
      });
  return (
    <LocaleContext.Provider value={state.settings.locale}>
      <main className="desktop-shell">
        <aside className="activity-bar" aria-label={tr("Workspace tools")}>
          <div className="rail-brand" title="OpenScratch">
            ⌘
          </div>
          <div className="toolbar">
            <RailButton
              icon="▶"
              className="primary"
              disabled={!loaded}
              onClick={() => void run()}
            >
              {tr("▶ Run")}
            </RailButton>
            <RailButton icon="□" onClick={stop}>
              {tr("■ Stop")}
            </RailButton>
            <RailButton
              icon="⌫"
              onClick={() => {
                pending.current = [];
                setOutputs((s) => ({ ...s, [tab.id]: [] }));
              }}
            >
              {tr("Clear")}
            </RailButton>
          </div>
          <nav>
            <RailButton
              icon="?"
              onClick={() => {
                setHelpQuery("");
                setModal("learn");
              }}
            >
              {tr("Learn")}
            </RailButton>

            <RailButton
              icon="▱"
              onClick={() => {
                setQuery("");
                setModal("snippets");
              }}
            >
              {tr("Snippets")}
            </RailButton>
            <RailButton
              icon="⬡"
              onClick={() => {
                setModal("packages");
                void window.openscratch
                  .packages("list")
                  .then(setPackages)
                  .catch(fail);
              }}
            >
              {tr("npm packages")}
            </RailButton>

            <RailButton
              icon="⚙"
              aria-label={tr("Preferences")}
              onClick={() => setModal("preferences")}
            >
              ⚙
            </RailButton>
          </nav>
        </aside>
        <div className="tabs">
          {state.tabs.map((t) => (
            <div
              className={`tab ${t.id === tab.id ? "active" : ""}`}
              key={t.id}
            >
              <button
                onClick={() => {
                  stop();
                  setState((s) => ({ ...s, active: t.id }));
                }}
              >
                <span className="language-icon">
                  {t.language.toUpperCase()}
                </span>
                {t.name}
              </button>
              <button
                title={tr("Close tab")}
                onClick={() => {
                  stop();
                  setState((s) => {
                    const tabs = s.tabs.filter((x) => x.id !== t.id);
                    if (!tabs.length) tabs.push(newTab(crypto.randomUUID()));
                    return {
                      ...s,
                      tabs,
                      active: s.active === t.id ? tabs[0].id : s.active,
                    };
                  });
                }}
              >
                ×
              </button>
            </div>
          ))}
          <button title={tr("New tab")} onClick={add}>
            ＋
          </button>
        </div>
        {error && (
          <div className="error-banner" role="alert">
            <span>{error}</span>
            <button onClick={() => setError("")}>×</button>
          </div>
        )}
        <section
          className="workbench"
          style={{
            gridTemplateColumns: `minmax(280px,${split}fr) 5px minmax(280px,${100 - split}fr)`,
          }}
        >
          <div className="editor-pane">
            <div className="pane-title">
              <span>{tr("EDITOR")}</span>
              <span>
                {tab.name}.{tab.language}
              </span>
            </div>
            <Editor
              tab={tab}
              snippets={state.snippets}
              hoveredLine={hoveredLine}
              settings={state.settings}
              onChange={codeChanged}
              onFormat={() => void format()}
              onSaveSnippet={saveSnippet}
              onReady={(e) => (editor.current = e)}
              onDiagnostics={setDiagnostics}
              onLogpoint={(line, clear) =>
                !["py", "cs"].includes(tab.language) &&
                patchTab({
                  logpoints: clear
                    ? []
                    : tab.logpoints.includes(line)
                      ? tab.logpoints.filter((x) => x !== line)
                      : [...tab.logpoints, line],
                })
              }
            />
          </div>
          <div
            className="divider"
            role="separator"
            aria-label={tr("Resize panels")}
            aria-orientation="vertical"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowLeft") setSplit((s) => Math.max(25, s - 2));
              if (e.key === "ArrowRight") setSplit((s) => Math.min(75, s + 2));
            }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
            }}
            onPointerMove={(e) => {
              if (e.buttons === 1)
                setSplit(
                  Math.max(
                    25,
                    Math.min(
                      75,
                      ((e.clientX -
                        e.currentTarget.parentElement!.getBoundingClientRect()
                          .left) /
                        e.currentTarget.parentElement!.getBoundingClientRect()
                          .width) *
                        100,
                    ),
                  ),
                );
            }}
          />
          <div className="results-pane">
            <div className="pane-title">
              <span>
                {tr("OUTPUT")}
                <span className={`status-dot ${status}`} />
              </span>
            </div>
            <div className="output-actions">
              <button onClick={() => expandOutput(true)}>
                {tr("Expand all")}
              </button>
              <button onClick={() => expandOutput(false)}>
                {tr("Collapse all")}
              </button>
            </div>
            <div className="console" data-testid="output">
              {!visibleOutputs.length && (
                <div className="empty">
                  <div className="empty-symbol">↳</div>
                  <h2>{tr("Room for a new idea.")}</h2>
                  <p>{tr("Run your code. Explore the result.")}</p>
                  <kbd>Ctrl / ⌘ R</kbd>
                </div>
              )}
              {visibleOutputs.map((o, i) => (
                <div
                  className={`output-row level-${o.level}`}
                  key={i}
                  onMouseEnter={() => setHoveredLine(o.line)}
                  onMouseLeave={() => setHoveredLine(undefined)}
                >
                  <button
                    className="source-line"
                    title={tr("Jump to source")}
                    onClick={() => {
                      if (o.line) {
                        editor.current?.revealLineInCenter(o.line);
                        editor.current?.setPosition({
                          lineNumber: o.line,
                          column: 1,
                        });
                        editor.current?.focus();
                      }
                    }}
                  >
                    {o.line ?? "·"}
                  </button>
                  <div className="output-values">
                    {o.values.map((v, j) => (
                      <Inspector key={j} value={v} />
                    ))}
                  </div>
                  <button
                    className="copy"
                    title={tr("Copy snapshot")}
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(
                          o.values
                            .map((v) =>
                              v.entries
                                ? JSON.stringify(v, null, 2)
                                : v.preview,
                            )
                            .join(" "),
                        )
                        .catch(fail)
                    }
                  >
                    ⧉
                  </button>
                </div>
              ))}
            </div>
            <div
              className={`preview-tile ${tab.runtime !== "browser" ? "hidden" : ""}`}
            >
              <div className="pane-title">
                <span>{tr("WEB PREVIEW")}</span>
                <span>{tr("isolated browser")}</span>
              </div>
              <div ref={preview} className="preview-host" />
            </div>
          </div>
        </section>
        <footer>
          <span className={`status-dot ${status}`} />
          <span>{status === "idle" ? tr("Ready") : tr(status)}</span>
          <span className="muted">
            {["py", "cs"].includes(tab.language)
              ? tr("Syntax highlighting; no language server")
              : `${diagnostics} ${tr("type errors · execution remains enabled")}`}
          </span>
          <span className="spacer" />
          <select
            aria-label={tr("Language")}
            value={tab.language}
            onChange={(e) => {
              stop();
              const language = e.target.value as Tab["language"];
              patchTab({
                language,
                runtime:
                  language === "py"
                    ? "python"
                    : language === "cs"
                      ? "dotnet"
                      : ["python", "dotnet"].includes(tab.runtime)
                        ? "node"
                        : tab.runtime,
                logpoints: [],
              });
            }}
          >
            {["js", "ts", "jsx", "tsx", "py", "cs"].map((x) => (
              <option key={x} value={x}>
                {x === "cs" ? "C#" : x === "py" ? "Python" : x.toUpperCase()}
              </option>
            ))}
          </select>
          <select
            aria-label={tr("Runtime")}
            value={tab.runtime}
            onChange={(e) => {
              stop();
              patchTab({ runtime: e.target.value as Tab["runtime"] });
            }}
          >
            {tab.language === "cs" ? (
              <option value="dotnet">.NET / C#</option>
            ) : tab.language === "py" ? (
              <option value="python">Python</option>
            ) : (
              <>
                <option value="node">Node.js</option>
                <option value="browser">{tr("Browser")}</option>
              </>
            )}
          </select>
          <span>UTF-8</span>
          <span className="offline">{tr("● Local execution")}</span>
        </footer>
        {modal && (
          <div
            className="overlay"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setModal(null);
            }}
          >
            <section
              className="modal"
              role="dialog"
              aria-modal="true"
              aria-labelledby="dialog-title"
            >
              <div className="modal-heading">
                <h2 id="dialog-title">
                  {
                    {
                      "new-tab": tr("Choose a language"),
                      learn: tr("Learn and reference"),
                      preferences: tr("Preferences"),
                      packages: tr("npm packages"),
                      snippets: tr("Snippet library"),
                      commands: tr("Command palette"),
                      tab: tr("Tab settings"),
                    }[modal]
                  }
                </h2>
                <button onClick={() => setModal(null)}>✕</button>
              </div>
              {modal === "new-tab" && (
                <div className="language-grid">
                  {(
                    [
                      ["js", "JavaScript", "Node.js"],
                      ["ts", "TypeScript", "Node.js"],
                      ["jsx", "JSX", "Browser"],
                      ["tsx", "TSX", "Browser"],
                      ["py", "Python", "Python"],
                      ["cs", "C#", ".NET"],
                    ] as const
                  ).map(([language, label, runtime]) => (
                    <button
                      key={language}
                      onClick={() => createTab(language)}
                      autoFocus={language === "js"}
                    >
                      <strong>{label}</strong>
                      <small>{runtime}</small>
                    </button>
                  ))}
                </div>
              )}
              {modal === "learn" && (
                <LearningPanel
                  language={tab.language}
                  initialQuery={helpQuery}
                  onOpen={(lesson) => {
                    stop();
                    const example: Tab = {
                      ...newTab(crypto.randomUUID(), lesson.title),
                      code: lesson.code,
                      language: lesson.language,
                      runtime:
                        lesson.language === "py"
                          ? "python"
                          : lesson.language === "cs"
                            ? "dotnet"
                            : "node",
                    };
                    setState((s) => ({
                      ...s,
                      tabs: [...s.tabs, example],
                      active: example.id,
                      settings: { ...s.settings, autoRun: false },
                    }));
                    setModal(null);
                  }}
                />
              )}
              {modal === "commands" && (
                <>
                  <input
                    autoFocus
                    placeholder={tr("Find a command…")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {commands
                    .filter(([label]) =>
                      label.toLowerCase().includes(query.toLowerCase()),
                    )
                    .map(([label, action]) => (
                      <button
                        className="list-row"
                        key={label}
                        onClick={() => {
                          setModal(null);
                          action();
                        }}
                      >
                        {label}
                        <span>↵</span>
                      </button>
                    ))}
                </>
              )}
              {modal === "snippets" && (
                <SnippetLibrary
                  snippets={state.snippets}
                  language={tab.language}
                  onInsert={(snippet) => {
                    const instance = editor.current,
                      selection = instance?.getSelection();
                    if (instance && selection) {
                      instance.pushUndoStop();
                      instance.executeEdits("insert-snippet", [
                        {
                          range: selection,
                          text: snippet.code,
                          forceMoveMarkers: true,
                        },
                      ]);
                      instance.pushUndoStop();
                    }
                    setModal(null);
                    instance?.focus();
                  }}
                  onChange={(snippets) => setState((s) => ({ ...s, snippets }))}
                  onOpen={(t) => {
                    stop();
                    const copy = { ...t, id: crypto.randomUUID() };
                    setState((s) => ({
                      ...s,
                      tabs: [...s.tabs, copy],
                      active: copy.id,
                    }));
                    setModal(null);
                  }}
                />
              )}
              {modal === "tab" && (
                <>
                  {tab.language === "cs" && (
                    <label>
                      {tr(".NET executable (optional)")}
                      <input
                        aria-label={tr(".NET executable")}
                        placeholder={tr(
                          "dotnet, or an absolute executable path",
                        )}
                        value={tab.dotnetExecutable}
                        onChange={(e) =>
                          patchTab({ dotnetExecutable: e.target.value })
                        }
                      />
                      <small>
                        {tr(
                          "Requires .NET SDK 8+. Use Console.WriteLine for output. C# has no Auto Log, NuGet manager, formatter or memory cap yet.",
                        )}
                      </small>
                    </label>
                  )}
                  {tab.language === "py" && (
                    <label>
                      {tr("Python executable (optional)")}
                      <input
                        aria-label={tr("Python executable")}
                        placeholder={tr(
                          "Automatic: py -3 (Windows), python3 (macOS/Linux)",
                        )}
                        value={tab.pythonExecutable}
                        onChange={(e) =>
                          patchTab({ pythonExecutable: e.target.value })
                        }
                      />
                      <small>
                        {tr(
                          "Python 3.10+ must be installed. Use an executable path, including a virtual environment if desired. No command arguments. npm packages do not apply to Python. No Python memory cap or logpoints yet.",
                        )}
                      </small>
                    </label>
                  )}
                  <label>
                    {tr("Name")}
                    <input
                      value={tab.name}
                      onChange={(e) => patchTab({ name: e.target.value })}
                    />
                  </label>
                  <label>
                    {tr("Working directory")}
                    <input
                      placeholder={tr("Default: dependency workspace")}
                      value={tab.cwd}
                      onChange={(e) => patchTab({ cwd: e.target.value })}
                    />
                  </label>
                  <label>
                    {tr("Environment variables (KEY=value, one per line)")}
                    <textarea
                      defaultValue={Object.entries(tab.env)
                        .map(([k, v]) => `${k}=${v}`)
                        .join("\n")}
                      onBlur={(e) => {
                        const env: Record<string, string> = {};
                        for (const line of e.target.value.split("\n")) {
                          const pos = line.indexOf("=");
                          if (
                            pos > 0 &&
                            /^[A-Za-z_][A-Za-z0-9_]*$/.test(line.slice(0, pos))
                          )
                            env[line.slice(0, pos)] = line.slice(pos + 1);
                        }
                        patchTab({ env });
                      }}
                    />
                  </label>
                  <p className="muted">
                    {tr(
                      "Node, Python and C# receive these variables. They are encrypted on disk when system secure storage is available; otherwise they remain session-only. Explicit console output can reveal them.",
                    )}
                  </p>
                  <div className="actions">
                    <button
                      onClick={() => {
                        const copy = {
                          ...tab,
                          id: crypto.randomUUID(),
                          name: `${tab.name} ${tr("copy")}`,
                        };
                        setState((s) => ({
                          ...s,
                          tabs: [...s.tabs, copy],
                          active: copy.id,
                        }));
                        setModal(null);
                      }}
                    >
                      {tr("Duplicate tab")}
                    </button>
                    <button onClick={() => void importFile()}>
                      {tr("Import file")}
                    </button>
                    <button
                      onClick={() =>
                        void window.openscratch.exportFile(tab).catch(fail)
                      }
                    >
                      {tr("Export file")}
                    </button>
                  </div>
                </>
              )}
              {modal === "preferences" && (
                <>
                  <div className="settings-links">
                    {" "}
                    <button
                      onClick={() =>
                        void window.openscratch
                          .openReference("docs")
                          .catch(fail)
                      }
                    >
                      {tr("Documentation")}
                    </button>
                    <button
                      onClick={() =>
                        void window.openscratch
                          .openReference("contribute")
                          .catch(fail)
                      }
                    >
                      {tr("Contribute")}
                    </button>
                    <button
                      title="Ctrl/Cmd Shift P"
                      onClick={() => {
                        setQuery("");
                        setModal("commands");
                      }}
                    >
                      {tr("⌕ Commands")}
                    </button>
                    <button onClick={() => setModal("tab")}>
                      {tr("Tab settings")}
                    </button>
                    <button onClick={openHelp}>{tr("Look up")}</button>
                  </div>
                  <div className="actions execution-toggles">
                    {" "}
                    <label>
                      <input
                        type="checkbox"
                        aria-label={tr("Auto Run")}
                        checked={state.settings.autoRun}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            settings: {
                              ...s.settings,
                              autoRun: e.target.checked,
                            },
                          }))
                        }
                      />
                      {tr("Auto Run")}
                    </label>
                    <label>
                      <input
                        type="checkbox"
                        aria-label={tr("Auto Log")}
                        disabled={tab.language === "cs"}
                        title={
                          tab.language === "cs"
                            ? tr("Use Console.WriteLine in C#")
                            : tr("Log top-level expressions")
                        }
                        checked={
                          state.settings.autoLog && tab.language !== "cs"
                        }
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            settings: {
                              ...s.settings,
                              autoLog: e.target.checked,
                            },
                          }))
                        }
                      />
                      {tr("Auto Log")}
                    </label>
                  </div>
                  <div className="settings-grid">
                    <label>
                      {tr("Interface language")}
                      <select
                        aria-label={tr("Interface language")}
                        value={state.settings.locale}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            settings: {
                              ...s.settings,
                              locale: e.target.value as "en" | "es",
                            },
                          }))
                        }
                      >
                        <option value="en">English</option>
                        <option value="es">Español</option>
                      </select>
                    </label>
                    <label>
                      {tr("Theme")}
                      <select
                        value={state.settings.theme}
                        onChange={(e) =>
                          setState((s) => ({
                            ...s,
                            settings: {
                              ...s.settings,
                              theme: e.target.value as "dark" | "light",
                            },
                          }))
                        }
                      >
                        <option value="dark">{tr("Dark")}</option>
                        <option value="light">{tr("Light")}</option>
                      </select>
                    </label>
                    {(["fontSize", "tabSize", "debounce"] as const).map(
                      (key) => (
                        <label key={key}>
                          {
                            {
                              fontSize: tr("Font size"),
                              tabSize: tr("Tab width"),
                              debounce: tr("Auto Run delay (ms)"),
                            }[key]
                          }
                          <input
                            type="number"
                            value={state.settings[key]}
                            onChange={(e) => {
                              const ranges = {
                                fontSize: [10, 30],
                                tabSize: [1, 8],
                                debounce: [100, 10000],
                              };
                              const value = Math.max(
                                ranges[key][0],
                                Math.min(
                                  ranges[key][1],
                                  Number(e.target.value),
                                ),
                              );
                              setState((s) => ({
                                ...s,
                                settings: { ...s.settings, [key]: value },
                              }));
                            }}
                          />
                        </label>
                      ),
                    )}
                  </div>
                  <div className="actions">
                    {(["wordWrap", "semi", "singleQuote"] as const).map(
                      (key) => (
                        <label key={key}>
                          <input
                            type="checkbox"
                            checked={state.settings[key]}
                            onChange={(e) =>
                              setState((s) => ({
                                ...s,
                                settings: {
                                  ...s.settings,
                                  [key]: e.target.checked,
                                },
                              }))
                            }
                          />
                          {
                            {
                              wordWrap: tr("Wrap lines"),
                              semi: tr("Semicolons"),
                              singleQuote: tr("Single quotes"),
                            }[key]
                          }
                        </label>
                      ),
                    )}
                  </div>
                  <details className="editor-preferences">
                    <summary>{tr("Editor and output")}</summary>
                    <div className="preference-toggles">
                      <label>
                        <input
                          type="checkbox"
                          checked={state.settings.lineNumbers}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              settings: {
                                ...s.settings,
                                lineNumbers: e.target.checked,
                              },
                            }))
                          }
                        />
                        {tr("Line numbers")}
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={state.settings.fontLigatures}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              settings: {
                                ...s.settings,
                                fontLigatures: e.target.checked,
                              },
                            }))
                          }
                        />
                        {tr("Font ligatures")}
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={state.settings.closeBrackets}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              settings: {
                                ...s.settings,
                                closeBrackets: e.target.checked,
                              },
                            }))
                          }
                        />
                        {tr("Close brackets")}
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={state.settings.renderWhitespace}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              settings: {
                                ...s.settings,
                                renderWhitespace: e.target.checked,
                              },
                            }))
                          }
                        />
                        {tr("Show whitespace")}
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={state.settings.highlightActiveLine}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              settings: {
                                ...s.settings,
                                highlightActiveLine: e.target.checked,
                              },
                            }))
                          }
                        />
                        {tr("Highlight active line")}
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={state.settings.autocomplete}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              settings: {
                                ...s.settings,
                                autocomplete: e.target.checked,
                              },
                            }))
                          }
                        />
                        {tr("Autocomplete")}
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={state.settings.linting}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              settings: {
                                ...s.settings,
                                linting: e.target.checked,
                              },
                            }))
                          }
                        />
                        {tr("Type diagnostics")}
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={state.settings.hoverInfo}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              settings: {
                                ...s.settings,
                                hoverInfo: e.target.checked,
                              },
                            }))
                          }
                        />
                        {tr("Hover information")}
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={state.settings.signatureHelp}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              settings: {
                                ...s.settings,
                                signatureHelp: e.target.checked,
                              },
                            }))
                          }
                        />
                        {tr("Signature help")}
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={state.settings.showUndefined}
                          onChange={(e) =>
                            setState((s) => ({
                              ...s,
                              settings: {
                                ...s.settings,
                                showUndefined: e.target.checked,
                              },
                            }))
                          }
                        />
                        {tr("Show undefined results")}
                      </label>
                    </div>
                  </details>
                  <h3>{tr("Execution protections")}</h3>
                  <div className="settings-grid">
                    {(
                      Object.keys(
                        state.settings.limits,
                      ) as (keyof typeof state.settings.limits)[]
                    ).map((key) => (
                      <label key={key}>
                        {
                          {
                            depth: tr("Inspection depth (1–12)"),
                            entries: tr("Properties (10–1000)"),
                            output: tr("Output entries (10–10000)"),
                            timeout: tr("Lifetime ms (0 disables)"),
                            memory: tr("Node heap MB (64–8192)"),
                          }[key]
                        }
                        <input
                          type="number"
                          value={state.settings.limits[key]}
                          onChange={(e) => {
                            const bounds = {
                              depth: [1, 12],
                              entries: [10, 1000],
                              output: [10, 10000],
                              timeout: [0, 3600000],
                              memory: [64, 8192],
                            };
                            setState((s) => ({
                              ...s,
                              settings: {
                                ...s.settings,
                                limits: {
                                  ...s.settings.limits,
                                  [key]: Math.min(
                                    bounds[key][1],
                                    Math.max(
                                      bounds[key][0],
                                      Number(e.target.value),
                                    ),
                                  ),
                                },
                              },
                            }));
                          }}
                        />
                      </label>
                    ))}
                  </div>
                  <p className="muted">
                    {tr(
                      "Node, Python and C# scripts have your user permissions. Process separation protects editor stability; it is not a security sandbox. A lifetime of 0 is useful for servers and previews.",
                    )}
                  </p>
                  <p className="muted">
                    {tr(
                      "AI: provider extension contracts are available; chat UI is not part of this version.",
                    )}
                  </p>
                </>
              )}
              {modal === "packages" && (
                <>
                  <p className="muted">
                    {tr(
                      "Dependencies are shared across tabs, isolated from this application's source.",
                    )}
                  </p>
                  <div className="package-search">
                    <input
                      aria-label={tr("Package name")}
                      placeholder={tr("Package or @scope/name")}
                      value={packageName}
                      onChange={(e) => setPackageName(e.target.value)}
                    />
                    <input
                      aria-label={tr("Package version")}
                      placeholder={tr("Version")}
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                    />
                    <button
                      disabled={busy || !packageName}
                      onClick={() =>
                        void window.openscratch
                          .packages("search", packageName)
                          .then(setResults)
                          .catch(fail)
                      }
                    >
                      {tr("Search")}
                    </button>
                    <button
                      className="primary"
                      disabled={busy || !packageName}
                      onClick={() => void changePackage("install")}
                    >
                      {tr("Install / update")}
                    </button>
                  </div>
                  <label>
                    <input
                      type="checkbox"
                      checked={scripts}
                      onChange={(e) => setScripts(e.target.checked)}
                    />
                    {tr(
                      "Allow install scripts for this operation (executes package code)",
                    )}
                  </label>
                  {results.map((p) => (
                    <button
                      className="list-row"
                      key={p.name}
                      onClick={() => {
                        setPackageName(p.name);
                        setVersion(p.version);
                      }}
                    >
                      <span>
                        {p.name}
                        <small>{p.description}</small>
                      </span>
                      <span>{p.version}</span>
                    </button>
                  ))}
                  <h3>{tr("Popular packages")}</h3>
                  <p className="muted">
                    {tr(
                      "A curated selection, not a live ranking. Install uses the latest version from npm. These packages are for JavaScript and TypeScript.",
                    )}
                  </p>
                  <div className="popular-packages">
                    {[
                      ["lodash", "Utilities"],
                      ["date-fns", "Dates"],
                      ["axios", "HTTP requests"],
                      ["zod", "Validation"],
                      ["react", "User interfaces"],
                      ["react-dom", "React rendering"],
                    ].map(([name, description]) => {
                      const installed = packages.some((p) => p.name === name);
                      return (
                        <div className="package-card" key={name}>
                          <div>
                            <strong>{name}</strong>
                            <small>{tr(description)}</small>
                          </div>
                          <button
                            disabled={busy || installed}
                            aria-label={`${tr(installed ? "Installed" : "Install")} ${name}`}
                            onClick={() =>
                              void changePackage("install", name, "latest")
                            }
                          >
                            {installed ? "✓" : "↓"}{" "}
                            {tr(installed ? "Installed" : "Install")}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                  <h3>{tr("Installed")}</h3>
                  {packages.length === 0 && (
                    <p className="muted">
                      {tr(
                        "No packages yet. Install react and react-dom for React previews.",
                      )}
                    </p>
                  )}
                  {packages.map((p) => (
                    <div className="list-row" key={p.name}>
                      <button
                        onClick={() => {
                          setPackageName(p.name);
                          setVersion(p.version);
                        }}
                      >
                        {p.name} <span className="muted">{p.version}</span>
                      </button>
                      <button
                        disabled={busy}
                        onClick={() => void changePackage("remove", p.name)}
                      >
                        {tr("Remove")}
                      </button>
                    </div>
                  ))}
                  {busy && <p>{tr("npm is working…")}</p>}
                  <pre className="package-log">{packageLog}</pre>
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </LocaleContext.Provider>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
