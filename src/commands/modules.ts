import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { toErrorEnvelope } from "../core/errors.js";
import type { OutputFormat } from "../core/output.js";
import { writeOutput } from "../core/output.js";
import {
  activeCanvas,
  csvFlag,
  flagValue,
  pageOptions,
  positionalArgs,
  requiredFlag
} from "./shared.js";

export type CanvasModule = {
  id: string | number;
  name?: string;
  position?: number;
  unlock_at?: string | null;
  require_sequential_progress?: boolean;
  publish_final_grade?: boolean;
  prerequisite_module_ids?: Array<string | number>;
  state?: string;
  completed_at?: string | null;
  items_count?: number;
  items_url?: string;
  items?: CanvasModuleItem[];
};

export type CanvasModuleItem = {
  id: string | number;
  module_id?: string | number;
  title?: string;
  type?: string;
  content_id?: string | number;
  position?: number;
  indent?: number;
  page_url?: string;
  external_url?: string;
  html_url?: string;
  url?: string;
  new_tab?: boolean;
  completion_requirement?: unknown;
  content_details?: unknown;
};

export async function handleModulesCommand(
  argv: string[],
  options: { format: OutputFormat }
): Promise<number> {
  const [subcommand] = argv;

  try {
    if (subcommand === "list") {
      return await listModules(argv.slice(1), options);
    }
    if (subcommand === "items") {
      return await listModuleItems(argv.slice(1), options);
    }
    if (subcommand === "item") {
      return await showModuleItem(argv.slice(1), options);
    }
    if (subcommand === "export") {
      return await exportModule(argv.slice(1), options);
    }

    await writeOutput(
      {
        ok: false,
        error: {
          code: "UNKNOWN_COMMAND",
          message: `Unknown modules command: ${argv.join(" ")}`,
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

async function listModules(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(argv, "--course-id", "Usage: canvas modules list --course-id <course-id>");
  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasModule[]>(`/api/v1/courses/${courseId}/modules`, {
    query: moduleListQuery(argv),
    ...pageOptions(argv)
  });

  await writeOutput(
    {
      ok: true,
      data: response.data.map(normalizeModule),
      meta: { ...response.meta, baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

async function listModuleItems(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(
    argv,
    "--course-id",
    "Usage: canvas modules items --course-id <course-id> --module-id <module-id>"
  );
  const moduleId = requiredFlag(
    argv,
    "--module-id",
    "Usage: canvas modules items --course-id <course-id> --module-id <module-id>"
  );
  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasModuleItem[]>(
    `/api/v1/courses/${courseId}/modules/${moduleId}/items`,
    {
      query: moduleItemsQuery(argv),
      ...pageOptions(argv)
    }
  );

  await writeOutput(
    {
      ok: true,
      data: response.data.map(normalizeModuleItem),
      meta: { ...response.meta, baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

async function showModuleItem(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(
    argv,
    "--course-id",
    "Usage: canvas modules item --course-id <course-id> --module-id <module-id> --item-id <item-id>"
  );
  const moduleId = requiredFlag(
    argv,
    "--module-id",
    "Usage: canvas modules item --course-id <course-id> --module-id <module-id> --item-id <item-id>"
  );
  const itemId =
    flagValue(argv, "--item-id") ??
    positionalArgs(argv)[0] ??
    missing("Usage: canvas modules item --course-id <course-id> --module-id <module-id> --item-id <item-id>");

  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasModuleItem>(
    `/api/v1/courses/${courseId}/modules/${moduleId}/items/${itemId}`,
    { query: moduleItemsQuery(argv) }
  );

  await writeOutput(
    {
      ok: true,
      data: normalizeModuleItem(response.data),
      meta: { ...response.meta, baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

async function exportModule(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(
    argv,
    "--course-id",
    "Usage: canvas modules export --course-id <course-id> --module-id <module-id> --out <dir>"
  );
  const moduleId = requiredFlag(
    argv,
    "--module-id",
    "Usage: canvas modules export --course-id <course-id> --module-id <module-id> --out <dir>"
  );
  const outDir = requiredFlag(
    argv,
    "--out",
    "Usage: canvas modules export --course-id <course-id> --module-id <module-id> --out <dir>"
  );

  const { client, profile } = await activeCanvas();
  const [moduleResponse, itemsResponse] = await Promise.all([
    client.get<CanvasModule>(`/api/v1/courses/${courseId}/modules/${moduleId}`),
    client.get<CanvasModuleItem[]>(`/api/v1/courses/${courseId}/modules/${moduleId}/items`, {
      query: { "include[]": ["content_details"], per_page: 100 },
      pageAll: true
    })
  ]);
  const moduleData = normalizeModule({ ...moduleResponse.data, items: itemsResponse.data });

  await mkdir(outDir, { recursive: true });
  const filePath = join(outDir, `module-${moduleData.id}.json`);
  await writeFile(filePath, `${JSON.stringify(moduleData, null, 2)}\n`, "utf8");

  await writeOutput(
    {
      ok: true,
      data: { module: moduleData, written: [{ path: filePath, kind: "module-json" }] },
      meta: { baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

export function moduleListQuery(argv: string[]) {
  return {
    "include[]": csvFlag(argv, "--include"),
    per_page: flagValue(argv, "--page-size")
  };
}

export function moduleItemsQuery(argv: string[]) {
  return {
    "include[]": csvFlag(argv, "--include"),
    per_page: flagValue(argv, "--page-size")
  };
}

export function normalizeModule(module: CanvasModule) {
  return {
    id: String(module.id),
    name: module.name,
    position: module.position,
    state: module.state,
    unlockAt: module.unlock_at,
    completedAt: module.completed_at,
    requireSequentialProgress: module.require_sequential_progress,
    publishFinalGrade: module.publish_final_grade,
    prerequisiteModuleIds: module.prerequisite_module_ids?.map(String),
    itemsCount: module.items_count,
    itemsUrl: module.items_url,
    items: module.items?.map(normalizeModuleItem)
  };
}

export function normalizeModuleItem(item: CanvasModuleItem) {
  return {
    id: String(item.id),
    moduleId: item.module_id === undefined ? undefined : String(item.module_id),
    title: item.title,
    type: item.type,
    contentId: item.content_id === undefined ? undefined : String(item.content_id),
    position: item.position,
    indent: item.indent,
    pageUrl: item.page_url,
    externalUrl: item.external_url,
    htmlUrl: item.html_url,
    apiUrl: item.url,
    newTab: item.new_tab,
    completionRequirement: item.completion_requirement,
    contentDetails: item.content_details
  };
}

function missing(message: string): never {
  throw new Error(message);
}
