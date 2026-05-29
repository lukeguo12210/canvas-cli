import { mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigStore, type CanvasConfig } from "./config-store.js";

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "canvas-config-"));
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe("ConfigStore", () => {
  it("writes, reads, and redacts config", async () => {
    const filePath = path.join(tempDir, "config.json");
    const store = new ConfigStore(filePath);
    const config: CanvasConfig = {
      version: 1,
      activeProfile: "default",
      profiles: {
        default: {
          schoolName: "Test University",
          baseUrl: "https://canvas.example.edu",
          token: "secret-token",
          createdAt: "2026-05-29T00:00:00.000Z"
        }
      }
    };

    await store.write(config);

    expect(await store.read()).toEqual(config);
    expect(await store.readRedacted()).toEqual({
      ...config,
      profiles: {
        default: {
          ...config.profiles.default,
          token: "[REDACTED]"
        }
      }
    });
  });

  it("creates config files with owner-only permissions on POSIX systems", async () => {
    const filePath = path.join(tempDir, "nested", "config.json");
    const store = new ConfigStore(filePath);

    await store.write({
      version: 1,
      activeProfile: "default",
      profiles: {
        default: {
          schoolName: "Test",
          baseUrl: "https://canvas.example.edu",
          token: "secret",
          createdAt: "2026-05-29T00:00:00.000Z"
        }
      }
    });

    if (process.platform !== "win32") {
      const fileMode = (await stat(filePath)).mode & 0o777;
      expect(fileMode).toBe(0o600);
    }
  });
});
