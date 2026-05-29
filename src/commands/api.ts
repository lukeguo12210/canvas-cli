import { CanvasCliError, toErrorEnvelope } from "../core/errors.js";
import type { OutputFormat } from "../core/output.js";
import { writeOutput } from "../core/output.js";
import { activeCanvas, flagValue, pageOptions, positionalArgs } from "./shared.js";

type QueryValue = string | number | boolean | Array<string | number | boolean> | undefined;

export async function handleApiCommand(
  argv: string[],
  options: { format: OutputFormat }
): Promise<number> {
  const [subcommand] = argv;

  try {
    if (subcommand === "get") {
      return await apiGet(argv.slice(1), options);
    }

    await writeOutput(
      {
        ok: false,
        error: {
          code: "UNKNOWN_COMMAND",
          message: `Unknown api command: ${argv.join(" ")}`,
          retryable: false
        }
      },
      options
    );
    return 1;
  } catch (error) {
    await writeOutput(toErrorEnvelope(error), options);
    return 1;
  }
}

async function apiGet(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const path = positionalArgs(argv)[0];
  if (!path) {
    throw new Error("Usage: canvas api get /api/v1/<path> [--params '<json>'] [--page-all]");
  }
  if (!path.startsWith("/api/v1/")) {
    throw new CanvasCliError("INVALID_API_PATH", "Raw API paths must start with /api/v1/.");
  }

  const params = parseParams(flagValue(argv, "--params"));
  const { client, profile } = await activeCanvas();
  const response = await client.get(path, {
    query: params,
    ...pageOptions(argv)
  });

  await writeOutput(
    {
      ok: true,
      data: response.data,
      meta: { ...response.meta, baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

export function parseParams(raw: string | undefined): Record<string, QueryValue> {
  if (!raw) {
    return {};
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new CanvasCliError("INVALID_PARAMS", "--params must be a JSON object.");
  }

  const params: Record<string, QueryValue> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (value === null) {
      continue;
    }
    if (isQueryValue(value)) {
      params[key] = value;
      continue;
    }
    throw new CanvasCliError(
      "INVALID_PARAMS",
      `Unsupported query value for ${key}. Use string, number, boolean, or arrays of those.`
    );
  }
  return params;
}

function isQueryValue(value: unknown): value is QueryValue {
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }
  if (Array.isArray(value)) {
    return value.every(
      (item) => typeof item === "string" || typeof item === "number" || typeof item === "boolean"
    );
  }
  return value === undefined;
}
