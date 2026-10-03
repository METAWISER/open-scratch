import { z } from "zod";
export const languageSchema = z.enum(["js", "ts", "jsx", "tsx", "py", "cs"]);
export const limitsSchema = z.object({
  depth: z.number().int().min(1).max(12),
  entries: z.number().int().min(10).max(1000),
  output: z.number().int().min(10).max(10000),
  timeout: z.number().int().min(0).max(3600000),
  memory: z.number().int().min(64).max(8192),
});
export const tabSchema = z.object({
  id: z.string().min(1).max(100),
  name: z.string().max(200),
  code: z.string().max(2_000_000),
  language: languageSchema,
  runtime: z.enum(["node", "browser", "python", "dotnet"]),
  dotnetExecutable: z.string().max(4096).default(""),
  pythonExecutable: z.string().max(4096).default(""),
  cwd: z.string().max(4096),
  env: z.record(
    z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
    z.string().max(32768),
  ),
  logpoints: z.array(z.number().int().positive()).max(1000),
});
export const settingsSchema = z.object({
  locale: z.enum(["en", "es"]).default("en"),
  theme: z.enum(["dark", "light"]),
  autoRun: z.boolean(),
  autoLog: z.boolean(),
  debounce: z.number().int().min(100).max(10000),
  fontSize: z.number().min(10).max(30),
  tabSize: z.number().int().min(1).max(8),
  wordWrap: z.boolean(),
  semi: z.boolean(),
  singleQuote: z.boolean(),
  limits: limitsSchema,
});
export const stateSchema = z.object({
  version: z.literal(1),
  tabs: z.array(tabSchema).min(1).max(100),
  active: z.string(),
  snippets: z.array(tabSchema).max(1000),
  settings: settingsSchema,
});
export const runSchema = z.object({
  runId: z.string().uuid(),
  tab: tabSchema,
  autoLog: z.boolean(),
  limits: limitsSchema,
});
export type Tab = z.infer<typeof tabSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type AppState = z.infer<typeof stateSchema>;
export type RunRequest = z.infer<typeof runSchema>;
export interface Value {
  type: string;
  preview: string;
  entries?: [string, Value][];
  truncated?: boolean;
  id?: number;
}
export interface Output {
  kind: "output";
  runId: string;
  level: string;
  line?: number;
  values: Value[];
}
export type RunEvent =
  | Output
  | {
      kind: "status";
      runId: string;
      status: "running" | "idle" | "stopped" | "error";
      message?: string;
    };
export interface PackageInfo {
  name: string;
  version: string;
  description?: string;
}
export interface Bridge {
  openReference(id: string): Promise<void>;
  load(): Promise<AppState>;
  save(state: AppState): Promise<void>;
  run(request: RunRequest): Promise<void>;
  stop(): Promise<void>;
  onEvent(listener: (event: RunEvent) => void): () => void;
  format(
    code: string,
    language: Tab["language"],
    options: Pick<Settings, "semi" | "singleQuote" | "tabSize">,
  ): Promise<string>;
  importFile(): Promise<{
    name: string;
    code: string;
    language: Tab["language"];
  } | null>;
  exportFile(tab: Tab): Promise<void>;
  packages(
    action: "list" | "search" | "install" | "remove",
    name?: string,
    version?: string,
    scripts?: boolean,
  ): Promise<PackageInfo[]>;
  types(): Promise<{ path: string; content: string }[]>;
  onPackageLog(listener: (text: string) => void): () => void;
  preview(bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
    visible: boolean;
  }): Promise<void>;
}
export const defaultSettings: Settings = {
  locale: "en",
  theme: "dark",
  autoRun: false,
  autoLog: true,
  debounce: 500,
  fontSize: 14,
  tabSize: 2,
  wordWrap: false,
  semi: true,
  singleQuote: true,
  limits: { depth: 5, entries: 100, output: 500, timeout: 30000, memory: 256 },
};
export function newTab(id: string, name = "Untitled"): Tab {
  return {
    id,
    name,
    code: "",
    language: "ts",
    runtime: "node",
    pythonExecutable: "",
    dotnetExecutable: "",
    cwd: "",
    env: {},
    logpoints: [],
  };
}
export function initialState(): AppState {
  const tab = newTab("welcome", "Welcome");
  tab.code =
    "// Your local JavaScript & TypeScript workbench\ninterface Person { name: string; skills: string[] }\nconst person: Person = { name: 'Ada', skills: ['TypeScript', 'Curiosity'] };\n\nperson\nawait Promise.resolve(1 + 2)\nconsole.log('Ready to explore. No account required.');\n";
  return {
    version: 1,
    tabs: [tab],
    active: tab.id,
    snippets: [],
    settings: defaultSettings,
  };
}
