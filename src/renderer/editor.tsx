import { translate } from "../shared/i18n";
import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker";
import TSWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker";
import type { Tab, Settings } from "../shared/contracts";
import type { IDisposable } from "monaco-editor";
globalThis.MonacoEnvironment = {
  getWorker: (_id, label) =>
    label === "typescript" || label === "javascript"
      ? new TSWorker()
      : new EditorWorker(),
};
let libraries: IDisposable[] = [];
let runtime: Tab["runtime"] = "node";
export async function refreshTypes() {
  const files = await window.openscratch.types();
  libraries.forEach((x) => x.dispose());
  libraries = [];
  for (const file of files) {
    if (runtime === "browser" && file.path.includes("/@types/node/")) continue;
    for (const defaults of [
      monaco.typescript.typescriptDefaults,
      monaco.typescript.javascriptDefaults,
    ])
      libraries.push(
        defaults.addExtraLib(file.content, `file:///${file.path}`),
      );
  }
}
export function Editor({
  tab,
  settings,
  onChange,
  onLogpoint,
  onReady,
  onDiagnostics,
}: {
  tab: Tab;
  settings: Settings;
  onChange: (code: string) => void;
  onLogpoint: (line: number, clear?: boolean) => void;
  onReady: (editor: monaco.editor.IStandaloneCodeEditor) => void;
  onDiagnostics: (count: number) => void;
}) {
  const host = useRef<HTMLDivElement>(null),
    editor = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const callbacks = useRef({ onChange, onLogpoint, onReady, onDiagnostics });
  callbacks.current = { onChange, onLogpoint, onReady, onDiagnostics };
  useEffect(() => {
    const instance = monaco.editor.create(host.current!, {
      automaticLayout: true,
      editContext: false,
      minimap: { enabled: false },
      padding: { top: 20, bottom: 20 },
      glyphMargin: true,
      scrollBeyondLastLine: false,
      fontFamily: "Cascadia Code, Consolas, monospace",
      fontLigatures: true,
      renderLineHighlight: "gutter",
    });
    editor.current = instance;
    callbacks.current.onReady(instance);
    const content = instance.onDidChangeModelContent(() =>
      callbacks.current.onChange(instance.getValue()),
    );
    const mouse = instance.onMouseDown((event) => {
      if (
        event.target.type ===
          monaco.editor.MouseTargetType.GUTTER_GLYPH_MARGIN &&
        event.target.position
      )
        callbacks.current.onLogpoint(event.target.position.lineNumber);
    });
    instance.addCommand(monaco.KeyCode.F9, () =>
      callbacks.current.onLogpoint(instance.getPosition()?.lineNumber ?? 1),
    );
    instance.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.F9,
      () => callbacks.current.onLogpoint(1, true),
    );
    const markers = monaco.editor.onDidChangeMarkers(() => {
      const model = instance.getModel();
      if (model)
        callbacks.current.onDiagnostics(
          monaco.editor
            .getModelMarkers({ resource: model.uri })
            .filter((x) => x.severity === monaco.MarkerSeverity.Error).length,
        );
    });
    void refreshTypes().catch(() => {});
    return () => {
      content.dispose();
      mouse.dispose();
      markers.dispose();
      instance.dispose();
    };
  }, []);
  useEffect(() => {
    const uri = monaco.Uri.parse(`file:///scratch-${tab.id}.${tab.language}`);
    let model = monaco.editor.getModel(uri);
    if (!model)
      model = monaco.editor.createModel(
        tab.code,
        tab.language === "cs"
          ? "csharp"
          : tab.language === "py"
            ? "python"
            : ["ts", "tsx"].includes(tab.language)
              ? "typescript"
              : "javascript",
        uri,
      );
    editor.current?.setModel(model);
    callbacks.current.onDiagnostics(
      monaco.editor
        .getModelMarkers({ resource: model.uri })
        .filter((x) => x.severity === monaco.MarkerSeverity.Error).length,
    );
    if (model.getValue() !== tab.code) model.setValue(tab.code);
  }, [tab.id, tab.language, tab.code]);
  useEffect(() => {
    if (runtime !== tab.runtime) {
      runtime = tab.runtime;
      void refreshTypes().catch(() => {});
    }
    monaco.editor.setTheme(settings.theme === "dark" ? "vs-dark" : "vs");
    editor.current?.updateOptions({
      fontSize: settings.fontSize,
      tabSize: settings.tabSize,
      wordWrap: settings.wordWrap ? "on" : "off",
    });
    for (const defaults of [
      monaco.typescript.typescriptDefaults,
      monaco.typescript.javascriptDefaults,
    ]) {
      defaults.setCompilerOptions({
        target: monaco.typescript.ScriptTarget.ESNext,
        module: monaco.typescript.ModuleKind.ESNext,
        moduleResolution: monaco.typescript.ModuleResolutionKind.NodeJs,
        jsx: monaco.typescript.JsxEmit.ReactJSX,
        allowNonTsExtensions: true,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: true,
        moduleDetection: 3,
        allowJs: true,
        checkJs: true,
        lib:
          tab.runtime === "browser"
            ? ["esnext", "dom", "dom.iterable"]
            : ["esnext"],
      });
      defaults.setDiagnosticsOptions({
        noSemanticValidation: false,
        noSyntaxValidation: false,
      });
    }
  }, [settings, tab.runtime]);
  useEffect(() => {
    const decorations = editor.current?.createDecorationsCollection(
      tab.logpoints.map((line) => ({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          glyphMarginClassName: "logpoint",
          glyphMarginHoverMessage: {
            value: translate(settings.locale, "Logpoint · F9 to remove"),
          },
        },
      })),
    );
    return () => decorations?.clear();
  }, [tab.logpoints, tab.id, settings.locale]);
  return <div className="editor" ref={host} data-testid="editor" />;
}
