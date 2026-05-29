import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { toErrorEnvelope } from "../core/errors.js";
import type { OutputFormat } from "../core/output.js";
import { writeOutput } from "../core/output.js";
import { activeCanvas, flagValue, pageOptions, positionalArgs, requiredFlag } from "./shared.js";

export type CanvasPage = {
  page_id?: string | number;
  url: string;
  title?: string;
  created_at?: string;
  updated_at?: string;
  editing_roles?: string;
  last_edited_by?: unknown;
  body?: string;
  published?: boolean;
  hide_from_students?: boolean;
  front_page?: boolean;
  html_url?: string;
  locked_for_user?: boolean;
  lock_info?: unknown;
  lock_explanation?: string;
};

export async function handlePagesCommand(
  argv: string[],
  options: { format: OutputFormat }
): Promise<number> {
  const [subcommand] = argv;

  try {
    if (subcommand === "list") {
      return await listPages(argv.slice(1), options);
    }
    if (subcommand === "show") {
      return await showPage(argv.slice(1), options);
    }
    if (subcommand === "export") {
      return await exportPage(argv.slice(1), options);
    }

    await writeOutput(
      {
        ok: false,
        error: {
          code: "UNKNOWN_COMMAND",
          message: `Unknown pages command: ${argv.join(" ")}`,
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

async function listPages(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(argv, "--course-id", "Usage: canvas pages list --course-id <course-id>");
  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasPage[]>(`/api/v1/courses/${courseId}/pages`, {
    query: pagesListQuery(argv),
    ...pageOptions(argv)
  });

  await writeOutput(
    {
      ok: true,
      data: response.data.map(normalizePage),
      meta: { ...response.meta, baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

async function showPage(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(argv, "--course-id", "Usage: canvas pages show --course-id <course-id> --page <url>");
  const pageUrl =
    flagValue(argv, "--page") ??
    positionalArgs(argv)[0] ??
    missing("Usage: canvas pages show --course-id <course-id> --page <url>");
  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasPage>(
    `/api/v1/courses/${courseId}/pages/${encodeURIComponent(pageUrl)}`
  );

  await writeOutput(
    {
      ok: true,
      data: normalizePage(response.data),
      meta: { ...response.meta, baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

async function exportPage(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(
    argv,
    "--course-id",
    "Usage: canvas pages export --course-id <course-id> --page <url> --out <dir>"
  );
  const pageUrl =
    flagValue(argv, "--page") ??
    positionalArgs(argv)[0] ??
    missing("Usage: canvas pages export --course-id <course-id> --page <url> --out <dir>");
  const outDir = requiredFlag(argv, "--out", "Usage: canvas pages export --course-id <course-id> --page <url> --out <dir>");
  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasPage>(
    `/api/v1/courses/${courseId}/pages/${encodeURIComponent(pageUrl)}`
  );
  const page = normalizePage(response.data);
  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, `${page.url}.json`);
  const htmlPath = join(outDir, `${page.url}.html`);
  await writeFile(jsonPath, `${JSON.stringify(page, null, 2)}\n`, "utf8");
  await writeFile(htmlPath, page.body ?? "", "utf8");

  await writeOutput(
    {
      ok: true,
      data: {
        page,
        written: [
          { path: jsonPath, kind: "page-json" },
          { path: htmlPath, kind: "page-html" }
        ]
      },
      meta: { baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

export function pagesListQuery(argv: string[]) {
  return {
    sort: flagValue(argv, "--sort"),
    search_term: flagValue(argv, "--search"),
    per_page: flagValue(argv, "--page-size")
  };
}

export function normalizePage(page: CanvasPage) {
  return {
    id: page.page_id === undefined ? undefined : String(page.page_id),
    url: page.url,
    title: page.title,
    createdAt: page.created_at,
    updatedAt: page.updated_at,
    editingRoles: page.editing_roles,
    lastEditedBy: page.last_edited_by,
    body: page.body,
    published: page.published,
    hideFromStudents: page.hide_from_students,
    frontPage: page.front_page,
    htmlUrl: page.html_url,
    lockedForUser: page.locked_for_user,
    lockInfo: page.lock_info,
    lockExplanation: page.lock_explanation
  };
}

function missing(message: string): never {
  throw new Error(message);
}
