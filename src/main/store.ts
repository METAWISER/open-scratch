import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { dirname } from "node:path";
import { initialState, stateSchema, type AppState } from "../shared/contracts";
export interface SecretStorage {
  encrypt(value: string): string;
  decrypt(value: string): string;
}
export class StateStore {
  private queue: Promise<void> = Promise.resolve();
  constructor(
    private file: string,
    private secrets?: SecretStorage,
  ) {}
  async load(): Promise<AppState> {
    try {
      const data = JSON.parse(await readFile(this.file, "utf8"));
      if (data.version !== 1) throw new Error("Unsupported state version");
      for (const tab of [...data.tabs, ...data.snippets]) {
        if (tab.encryptedEnv && this.secrets)
          tab.env = JSON.parse(this.secrets.decrypt(tab.encryptedEnv));
        else tab.env = {};
        delete tab.encryptedEnv;
        tab.logpoints = [];
      }
      return stateSchema.parse(data);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT")
        return initialState();
      throw new Error(
        `Could not load saved workspace; original file preserved: ${String(error)}`,
        { cause: error },
      );
    }
  }
  save(state: AppState): Promise<void> {
    const validated = stateSchema.parse(state);
    const data = {
      ...validated,
      tabs: [...validated.tabs],
      snippets: [...validated.snippets],
    };
    for (const list of [data.tabs, data.snippets])
      for (let i = 0; i < list.length; i++) {
        const tab = list[i];
        list[i] = {
          ...tab,
          env: {},
          logpoints: [],
          ...(this.secrets && Object.keys(tab.env).length
            ? { encryptedEnv: this.secrets.encrypt(JSON.stringify(tab.env)) }
            : {}),
        };
      }
    this.queue = this.queue
      .catch(() => {})
      .then(async () => {
        await mkdir(dirname(this.file), { recursive: true });
        await writeFile(
          `${this.file}.tmp`,
          JSON.stringify(data, null, 2),
          "utf8",
        );
        await rename(`${this.file}.tmp`, this.file);
      });
    return this.queue;
  }
  flush() {
    return this.queue;
  }
}
