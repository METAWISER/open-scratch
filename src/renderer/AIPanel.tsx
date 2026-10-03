import { useEffect, useRef, useState } from "react";
import * as monaco from "monaco-editor";
import type { Tab } from "../shared/contracts";
import type { AIStatus } from "../ai/wire";
import { useTranslation } from "./i18n";
function CodeDiff({
  original,
  replacement,
  language,
}: {
  original: string;
  replacement: string;
  language: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const editor = monaco.editor.createDiffEditor(host.current!, {
      readOnly: true,
      originalEditable: false,
      automaticLayout: true,
      renderSideBySide: false,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
    });
    const before = monaco.editor.createModel(original, language);
    const after = monaco.editor.createModel(replacement, language);
    editor.setModel({ original: before, modified: after });
    return () => {
      editor.dispose();
      before.dispose();
      after.dispose();
    };
  }, [original, replacement, language]);
  return <div className="ai-diff" ref={host} aria-label="Code diff" />;
}
export function AIPanel({
  tab,
  onApply,
}: {
  tab: Tab;
  onApply: (original: Tab, replacement: string) => void;
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<AIStatus>();
  const [configOpen, setConfigOpen] = useState(true);
  const [endpoint, setEndpoint] = useState("https://api.openai.com/v1");
  const [model, setModel] = useState("");
  const [key, setKey] = useState("");
  const [remember, setRemember] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [include, setInclude] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [stream, setStream] = useState("");
  const [proposal, setProposal] = useState<{ original: Tab; code: string }>();
  const active = useRef<string | null>(null);
  const snapshot = useRef(tab);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    void window.openscratch
      .aiStatus()
      .then((s) => {
        if (!mounted.current) return;
        setStatus(s);
        if (s.settings) {
          setConfigOpen(false);
          setEndpoint(s.settings.endpoint);
          setModel(s.settings.model);
        }
      })
      .catch(() => setError(t("Unable to load AI settings.")));
    const off = window.openscratch.onAIEvent((event) => {
      if (event.id !== active.current) return;
      if (event.type === "text") setStream((text) => text + event.text);
      else {
        active.current = null;
        setBusy(false);
        if (event.type === "done")
          setProposal({ original: snapshot.current, code: event.code });
        else setError(t(event.message));
      }
    });
    return () => {
      mounted.current = false;
      off();
      if (active.current) void window.openscratch.aiCancel(active.current);
      active.current = null;
    };
  }, []);
  const save = async () => {
    const result = await window.openscratch.aiConfigure(
      { endpoint: endpoint.trim(), model: model.trim() },
      key || undefined,
      remember,
    );
    if (mounted.current) {
      setStatus(result);
      setConfigOpen(false);
      setKey("");
    }
  };
  const generate = async () => {
    setBusy(true);
    setError("");
    setStream("");
    setProposal(undefined);
    const id = crypto.randomUUID();
    active.current = id;
    snapshot.current = { ...tab };
    try {
      await save();
      if (!mounted.current || active.current !== id) return;
      await window.openscratch.aiGenerate({
        id,
        prompt,
        context: {
          code: include ? tab.code : "",
          language: tab.language,
          runtime: tab.runtime,
        },
      });
    } catch {
      if (mounted.current && active.current === id) {
        active.current = null;
        setBusy(false);
        setError(
          t("AI request failed. Check endpoint, model and secure storage."),
        );
      }
    }
  };
  const cancel = () => {
    const id = active.current;
    active.current = null;
    if (id) void window.openscratch.aiCancel(id);
    setBusy(false);
    setError(t("Generation cancelled or timed out."));
  };
  return (
    <div className="ai-panel">
      <p className="muted">
        {t(
          "Use your own OpenAI-compatible service. No OpenScratch AI quota; your provider may charge for requests.",
        )}
      </p>
      <fieldset disabled={busy || !status}>
        <details
          open={configOpen}
          onToggle={(e) => setConfigOpen(e.currentTarget.open)}
        >
          <summary>{t("Provider settings")}</summary>
          <label>
            {t("API base URL")}
            <input
              aria-label={t("API base URL")}
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
              placeholder="https://your-service.example/v1"
            />
          </label>
          <label>
            {t("Model")}
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder={t("Model ID from your provider")}
            />
          </label>
          <label>
            {t("API key")}
            <input
              type="password"
              autoComplete="off"
              spellCheck={false}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={
                status?.hasKey
                  ? t("Stored key available; leave blank to keep")
                  : t("Optional for local services")
              }
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={remember}
              disabled={!status?.secureStorage}
              onChange={(e) => setRemember(e.target.checked)}
            />
            {t("Remember key in system secure storage")}
          </label>
          <p className="muted">
            {t(
              status?.secureStorage
                ? "New keys are session-only unless Remember is selected. Keys are bound to the exact endpoint."
                : "Secure storage unavailable. New keys stay in memory for this session.",
            )}
          </p>
          <div className="actions">
            <button
              onClick={() => {
                setBusy(true);
                void save()
                  .catch(() => setError(t("Unable to save AI settings.")))
                  .finally(() => {
                    if (mounted.current) setBusy(false);
                  });
              }}
            >
              {t("Save AI settings")}
            </button>
            <button
              disabled={!status?.hasKey}
              onClick={() => {
                setBusy(true);
                void window.openscratch
                  .aiForgetKey()
                  .then(setStatus)
                  .catch(() => setError(t("Unable to remove key.")))
                  .finally(() => {
                    if (mounted.current) setBusy(false);
                  });
              }}
            >
              {t("Remove saved key")}
            </button>
          </div>
        </details>
        <p className="muted">
          {endpoint} · {model || t("Model ID from your provider")}
        </p>
        <label>
          {t("Describe the code to generate")}
          <textarea
            value={prompt}
            maxLength={16000}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={include}
            onChange={(e) => setInclude(e.target.checked)}
          />
          {t("Include current tab code")}
        </label>
      </fieldset>
      {include && tab.code.length > 100000 && (
        <p role="alert">
          {t("Current code exceeds the 100,000-character AI context limit.")}
        </p>
      )}
      <details>
        <summary>{t("Review what will be sent")}</summary>
        <p>
          {endpoint} · {model} · {tab.language} / {tab.runtime}
        </p>
        <pre>{prompt || t("No prompt yet.")}</pre>
        {include && <pre>{tab.code}</pre>}
        <p className="muted">
          {t(
            "Only your prompt, language, runtime and optionally this code are sent, with an instruction to return source code. Environment variables, other tabs, output and file paths are excluded. Review code for embedded secrets.",
          )}
        </p>
      </details>
      <div className="actions">
        <button
          className="primary"
          disabled={
            busy ||
            !status ||
            !prompt.trim() ||
            !model.trim() ||
            (include && tab.code.length > 100000)
          }
          onClick={() => void generate()}
        >
          {t("Generate code")}
        </button>
        {busy && <button onClick={cancel}>{t("Cancel generation")}</button>}
      </div>
      {error && <p role="alert">{error}</p>}
      {busy && (
        <pre className="ai-stream" aria-label={t("Generating code")}>
          {stream || t("Waiting for provider…")}
        </pre>
      )}
      {proposal && (
        <>
          <h3>{t("Review changes before applying")}</h3>
          <p className="muted">
            {t(
              "Red lines are removed; green lines are added. Applying replaces this tab and turns Auto Run off. Nothing runs automatically.",
            )}
          </p>
          <CodeDiff
            original={proposal.original.code}
            replacement={proposal.code}
            language={
              {
                js: "javascript",
                jsx: "javascript",
                ts: "typescript",
                tsx: "typescript",
                py: "python",
                cs: "csharp",
              }[tab.language]
            }
          />
          <div className="actions">
            <button
              className="primary"
              onClick={() => {
                try {
                  onApply(proposal.original, proposal.code);
                } catch {
                  setError(
                    t(
                      "Code changed after generation. Generate again before applying.",
                    ),
                  );
                }
              }}
            >
              {t("Accept and apply")}
            </button>
            <button onClick={() => setProposal(undefined)}>
              {t("Discard proposal")}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
