import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { CredentialStorage } from "./contracts";
import type { SecretStorage } from "../main/store";
export class SecureCredentials implements CredentialStorage {
  constructor(
    private directory: string,
    private encryption?: SecretStorage,
  ) {}
  private path(id: string) {
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id))
      throw new Error("Invalid credential id");
    return join(this.directory, id + ".secret");
  }
  async get(id: string) {
    const file = this.path(id);
    if (!this.encryption) return undefined;
    try {
      return this.encryption.decrypt(await readFile(file, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
      throw error;
    }
  }
  async set(id: string, value: string) {
    const file = this.path(id);
    if (!this.encryption)
      throw new Error(
        "System secure storage unavailable; refusing plaintext credentials",
      );
    await mkdir(this.directory, { recursive: true });
    await writeFile(file, this.encryption.encrypt(value), { mode: 0o600 });
  }
  async delete(id: string) {
    const { unlink } = await import("node:fs/promises");
    try {
      await unlink(this.path(id));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
}
