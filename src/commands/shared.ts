import { CanvasClient } from "../core/canvas-client.js";
import { ConfigStore, type CanvasProfile } from "../core/config-store.js";

export type ActiveCanvas = {
  profile: CanvasProfile;
  client: CanvasClient;
};

export async function activeCanvas(): Promise<ActiveCanvas> {
  const profile = await new ConfigStore().activeProfile();
  return {
    profile,
    client: new CanvasClient({
      baseUrl: profile.baseUrl,
      token: profile.token
    })
  };
}

export function flagValue(argv: string[], flag: string): string | undefined {
  const index = argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }
  return argv[index + 1];
}

export function requiredFlag(argv: string[], flag: string, usage: string): string {
  const value = flagValue(argv, flag);
  if (!value) {
    throw new Error(usage);
  }
  return value;
}

export function hasFlag(argv: string[], flag: string): boolean {
  return argv.includes(flag);
}

export function csvFlag(argv: string[], flag: string): string[] | undefined {
  const raw = flagValue(argv, flag);
  if (!raw) {
    return undefined;
  }
  const values = raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length > 0 ? values : undefined;
}

export function pageOptions(argv: string[]): { pageAll: boolean; pageLimit?: number } {
  const pageLimitRaw = flagValue(argv, "--page-limit");
  return {
    pageAll: hasFlag(argv, "--page-all"),
    pageLimit: pageLimitRaw ? Number.parseInt(pageLimitRaw, 10) : undefined
  };
}

export function positionalArgs(argv: string[]): string[] {
  const valueFlags = new Set([
    "--course-id",
    "--module-id",
    "--item-id",
    "--assignment-id",
    "--quiz-id",
    "--topic-id",
    "--page",
    "--path",
    "--out",
    "--format",
    "--page-limit",
    "--page-size",
    "--page-delay",
    "--enrollment-state",
    "--state",
    "--include",
    "--params",
    "--bucket",
    "--search",
    "--order-by",
    "--sort",
    "--file-id",
    "--folder-id",
    "--group-id",
    "--content-type",
    "--school",
    "--school-query",
    "--school-url",
    "--url",
    "--school-name",
    "--name",
    "--token",
    "--token-env"
  ]);
  const values: string[] = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg.startsWith("--")) {
      if (valueFlags.has(arg)) {
        index += 1;
      }
      continue;
    }
    values.push(arg);
  }
  return values;
}
