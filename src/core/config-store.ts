import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { configPath } from "./paths.js";
import { redactSecrets } from "./redaction.js";

export type CanvasProfile = {
  schoolName: string;
  baseUrl: string;
  token: string;
  createdAt: string;
  validatedAt?: string;
  user?: {
    id?: string;
    name?: string;
  };
};

export type CanvasConfig = {
  version: 1;
  activeProfile: string;
  profiles: Record<string, CanvasProfile>;
};

export class ConfigStore {
  constructor(private readonly filePath = configPath()) {}

  async read(): Promise<CanvasConfig | null> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      return JSON.parse(raw) as CanvasConfig;
    } catch (error) {
      if (isNotFound(error)) {
        return null;
      }
      throw error;
    }
  }

  async write(config: CanvasConfig): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true, mode: 0o700 });
    await writeFile(this.filePath, `${JSON.stringify(config, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600
    });
  }

  async remove(): Promise<void> {
    await rm(this.filePath, { force: true });
  }

  async readRedacted(): Promise<CanvasConfig | null> {
    const config = await this.read();
    return config ? (redactSecrets(config) as CanvasConfig) : null;
  }
}

function isNotFound(error: unknown): boolean {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === "ENOENT");
}
