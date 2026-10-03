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
  "learn" | "preferences" | "packages" | "snippets" | "commands" | "tab" | null;
function App() {
  const [state, setState] = useState<AppState>(initialState),
    [loaded, setLoaded] = useState(false),
    [error, setError] = useState(""),
    [modal, setModal] = useState<Modal>(null),
    [outputs, setOutputs] = useState<Record<string, Output[]>>({}),
    [status, setStatus] = useState("idle"),
    [diagnostics, setDiagnostics] = useState(0),
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
  }, [state.settings.theme]);
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
  const add = () => {
    stop();
    const t = newTab(crypto.randomUUID());
    setState((s) => ({ ...s, tabs: [...s.tabs, t], active: t.id }));
  };
  const saveSnippet = () =>
    setState((s) => ({
      ...s,
      snippets: [...s.snippets.filter((t) => t.id !== tab.id), { ...tab }],
    }));
  const importFile = async () => {
    try {
      const data = await window.openscratch.importFile();
      if (data) {
        stop();
        const t: Tab = {
          ...newTab(crypto.randomUUID()),
          ...data,
          runtime: data.language === "py" ? "python" : "node",
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
        const s = current.current,
          t = s.tabs.find((t) => t.id === s.active)!;
        setState((s) => ({
          ...s,
          snippets: [...s.snippets.filter((x) => x.id !== t.id), t],
        }));
      }
      if (e.key === "f" && e.shiftKey) {
        e.preventDefault();
        void format();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [run, stop, format]);
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
    ["Consultar documentación del término bajo el cursor", openHelp],
    [
      "Contribute on GitHub",
      () => void window.openscratch.openReference("contribute").catch(fail),
    ],
    ["Run code · Ctrl/Cmd R", () => void run()],
    ["Stop · Ctrl/Cmd Shift R", stop],
    ["Format · Ctrl/Cmd Shift F", () => void format()],
    ["New tab", add],
    ["Save snippet · Ctrl/Cmd S", saveSnippet],
    ["Import file", () => void importFile()],
    ["Export file", () => void window.openscratch.exportFile(tab).catch(fail)],
    ["Clear results", () => setOutputs((s) => ({ ...s, [tab.id]: [] }))],
    ["Preferences", () => setModal("preferences")],
    [
      "npm packages",
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
  return (
    <main>
      <header>
        <div className="brand">
          <span className="brand-icon">⌘</span>
          <strong>OpenScratch</strong>
          <span className="badge">LOCAL</span>
        </div>
        <nav>
          <button
            onClick={() => {
              setHelpQuery("");
              setModal("learn");
            }}
          >
            Aprender
          </button>
          <button
            onClick={() =>
              void window.openscratch.openReference("contribute").catch(fail)
            }
          >
            Contribute
          </button>
          <button
            onClick={() => {
              setQuery("");
              setModal("snippets");
            }}
          >
            Snippets
          </button>
          <button
            onClick={() => {
              setModal("packages");
              void window.openscratch
                .packages("list")
                .then(setPackages)
                .catch(fail);
            }}
          >
            npm packages
          </button>
          <button
            title="Ctrl/Cmd Shift P"
            onClick={() => {
              setQuery("");
              setModal("commands");
            }}
          >
            ⌕ Commands
          </button>
          <button onClick={() => setModal("preferences")}>⚙</button>
        </nav>
      </header>
      <div className="tabs">
        {state.tabs.map((t) => (
          <div className={`tab ${t.id === tab.id ? "active" : ""}`} key={t.id}>
            <button
              onClick={() => {
                stop();
                setState((s) => ({ ...s, active: t.id }));
              }}
            >
              <span className="language-icon">{t.language.toUpperCase()}</span>
              {t.name}
            </button>
            <button
              title="Close tab"
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
        <button title="New tab" onClick={add}>
          ＋
        </button>
      </div>
      <div className="toolbar">
        <button
          className="primary"
          disabled={!loaded}
          onClick={() => void run()}
        >
          ▶ Run
        </button>
        <button onClick={stop}>■ Stop</button>
        <label>
          <input
            type="checkbox"
            checked={state.settings.autoRun}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                settings: { ...s.settings, autoRun: e.target.checked },
              }))
            }
          />
          Auto Run
        </label>
        <label>
          <input
            type="checkbox"
            checked={state.settings.autoLog}
            onChange={(e) =>
              setState((s) => ({
                ...s,
                settings: { ...s.settings, autoLog: e.target.checked },
              }))
            }
          />
          Auto Log
        </label>
        <span className="spacer" />
        <button onClick={openHelp}>Consultar</button>
        <button
          disabled={tab.language === "py"}
          title={
            tab.language === "py"
              ? "Python formatting is not available yet"
              : "Format code"
          }
          onClick={() => void format()}
        >
          Format
        </button>
        <button onClick={saveSnippet}>Save snippet</button>
        <button onClick={() => setModal("tab")}>Tab settings</button>
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
            <span>EDITOR</span>
            <span>
              {tab.name}.{tab.language}
            </span>
          </div>
          <Editor
            tab={tab}
            settings={state.settings}
            onChange={codeChanged}
            onReady={(e) => (editor.current = e)}
            onDiagnostics={setDiagnostics}
            onLogpoint={(line, clear) =>
              tab.language !== "py" &&
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
          aria-label="Resize panels"
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
                  Math.min(75, (e.clientX / window.innerWidth) * 100),
                ),
              );
          }}
        />
        <div className="results-pane">
          <div className="pane-title">
            <span>
              OUTPUT <span className={`status-dot ${status}`} />
            </span>
            <button
              onClick={() => {
                pending.current = [];
                setOutputs((s) => ({ ...s, [tab.id]: [] }));
              }}
            >
              Clear
            </button>
          </div>
          <div className="console" data-testid="output">
            {!outputs[tab.id]?.length && (
              <div className="empty">
                <div className="empty-symbol">↳</div>
                <h2>Room for a new idea.</h2>
                <p>Run your code. Explore the result.</p>
                <kbd>Ctrl / ⌘ R</kbd>
              </div>
            )}
            {outputs[tab.id]?.map((o, i) => (
              <div className={`output-row level-${o.level}`} key={i}>
                <button
                  className="source-line"
                  title="Jump to source"
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
                  title="Copy snapshot"
                  onClick={() =>
                    void navigator.clipboard
                      .writeText(
                        o.values
                          .map((v) =>
                            v.entries ? JSON.stringify(v, null, 2) : v.preview,
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
              <span>WEB PREVIEW</span>
              <span>isolated browser</span>
            </div>
            <div ref={preview} className="preview-host" />
          </div>
        </div>
      </section>
      <footer>
        <span className={`status-dot ${status}`} />
        <span>{status === "idle" ? "Ready" : status}</span>
        <span className="muted">
          {tab.language === "py"
            ? "Python · syntax highlighting; no language server"
            : `${diagnostics} type errors · execution remains enabled`}
        </span>
        <span className="spacer" />
        <select
          aria-label="Language"
          value={tab.language}
          onChange={(e) => {
            stop();
            const language = e.target.value as Tab["language"];
            patchTab({
              language,
              runtime:
                language === "py"
                  ? "python"
                  : tab.runtime === "python"
                    ? "node"
                    : tab.runtime,
              logpoints: [],
            });
          }}
        >
          {["js", "ts", "jsx", "tsx", "py"].map((x) => (
            <option key={x} value={x}>
              {x.toUpperCase()}
            </option>
          ))}
        </select>
        <select
          aria-label="Runtime"
          value={tab.runtime}
          onChange={(e) => {
            stop();
            patchTab({ runtime: e.target.value as Tab["runtime"] });
          }}
        >
          {tab.language === "py" ? (
            <option value="python">Python</option>
          ) : (
            <>
              <option value="node">Node.js</option>
              <option value="browser">Browser</option>
            </>
          )}
        </select>
        <span>UTF-8</span>
        <span className="offline">● Local execution</span>
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
            aria-label={modal}
          >
            <div className="modal-heading">
              <h2>
                {
                  {
                    learn: "Aprender y consultar",
                    preferences: "Preferences",
                    packages: "npm packages",
                    snippets: "Snippet library",
                    commands: "Command palette",
                    tab: "Tab settings",
                  }[modal]
                }
              </h2>
              <button onClick={() => setModal(null)}>✕</button>
            </div>
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
                    runtime: lesson.language === "py" ? "python" : "node",
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
                  placeholder="Find a command…"
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
                {tab.language === "py" && (
                  <label>
                    Python executable (optional)
                    <input
                      aria-label="Python executable"
                      placeholder="Automatic: py -3 (Windows), python3 (macOS/Linux)"
                      value={tab.pythonExecutable}
                      onChange={(e) =>
                        patchTab({ pythonExecutable: e.target.value })
                      }
                    />
                    <small>
                      Python 3.10+ must be installed. Use an executable path,
                      including a virtual environment if desired. No command
                      arguments. npm packages do not apply to Python. No Python
                      memory cap or logpoints yet.
                    </small>
                  </label>
                )}
                <label>
                  Name
                  <input
                    value={tab.name}
                    onChange={(e) => patchTab({ name: e.target.value })}
                  />
                </label>
                <label>
                  Working directory
                  <input
                    placeholder="Default: dependency workspace"
                    value={tab.cwd}
                    onChange={(e) => patchTab({ cwd: e.target.value })}
                  />
                </label>
                <label>
                  Environment variables (KEY=value, one per line)
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
                  Only Node receives these variables. They are encrypted on disk
                  when system secure storage is available; otherwise they remain
                  session-only. Explicit console output can reveal them.
                </p>
                <div className="actions">
                  <button
                    onClick={() => {
                      const copy = {
                        ...tab,
                        id: crypto.randomUUID(),
                        name: `${tab.name} copy`,
                      };
                      setState((s) => ({
                        ...s,
                        tabs: [...s.tabs, copy],
                        active: copy.id,
                      }));
                      setModal(null);
                    }}
                  >
                    Duplicate tab
                  </button>
                  <button onClick={() => void importFile()}>Import file</button>
                  <button
                    onClick={() =>
                      void window.openscratch.exportFile(tab).catch(fail)
                    }
                  >
                    Export file
                  </button>
                </div>
              </>
            )}
            {modal === "preferences" && (
              <>
                <div className="settings-grid">
                  <label>
                    Theme
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
                      <option value="dark">Dark</option>
                      <option value="light">Light</option>
                    </select>
                  </label>
                  {(["fontSize", "tabSize", "debounce"] as const).map((key) => (
                    <label key={key}>
                      {
                        {
                          fontSize: "Font size",
                          tabSize: "Tab width",
                          debounce: "Auto Run delay (ms)",
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
                            Math.min(ranges[key][1], Number(e.target.value)),
                          );
                          setState((s) => ({
                            ...s,
                            settings: { ...s.settings, [key]: value },
                          }));
                        }}
                      />
                    </label>
                  ))}
                </div>
                <div className="actions">
                  {(["wordWrap", "semi", "singleQuote"] as const).map((key) => (
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
                          wordWrap: "Wrap lines",
                          semi: "Semicolons",
                          singleQuote: "Single quotes",
                        }[key]
                      }
                    </label>
                  ))}
                </div>
                <h3>Execution protections</h3>
                <div className="settings-grid">
                  {(
                    Object.keys(
                      state.settings.limits,
                    ) as (keyof typeof state.settings.limits)[]
                  ).map((key) => (
                    <label key={key}>
                      {
                        {
                          depth: "Inspection depth (1–12)",
                          entries: "Properties (10–1000)",
                          output: "Output entries (10–10000)",
                          timeout: "Lifetime ms (0 disables)",
                          memory: "Node heap MB (64–8192)",
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
                  Node scripts have your user permissions. Process separation
                  protects editor stability; it is not a security sandbox. A
                  lifetime of 0 is useful for servers and previews.
                </p>
                <p className="muted">
                  AI: provider extension contracts are available; chat UI is not
                  part of this version.
                </p>
              </>
            )}
            {modal === "packages" && (
              <>
                <p className="muted">
                  Dependencies are shared across tabs, isolated from this
                  application's source.
                </p>
                <div className="package-search">
                  <input
                    aria-label="Package name"
                    placeholder="Package or @scope/name"
                    value={packageName}
                    onChange={(e) => setPackageName(e.target.value)}
                  />
                  <input
                    aria-label="Package version"
                    placeholder="Version"
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
                    Search
                  </button>
                  <button
                    className="primary"
                    disabled={busy || !packageName}
                    onClick={() => void changePackage("install")}
                  >
                    Install / update
                  </button>
                </div>
                <label>
                  <input
                    type="checkbox"
                    checked={scripts}
                    onChange={(e) => setScripts(e.target.checked)}
                  />
                  Allow install scripts for this operation (executes package
                  code)
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
                <h3>Installed</h3>
                {packages.length === 0 && (
                  <p className="muted">
                    No packages yet. Install react and react-dom for React
                    previews.
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
                      Remove
                    </button>
                  </div>
                ))}
                {busy && <p>npm is working…</p>}
                <pre className="package-log">{packageLog}</pre>
              </>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
