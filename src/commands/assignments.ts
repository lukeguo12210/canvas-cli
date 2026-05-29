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

export type CanvasAssignment = {
  id: string | number;
  name?: string;
  description?: string | null;
  due_at?: string | null;
  unlock_at?: string | null;
  lock_at?: string | null;
  points_possible?: number | null;
  grading_type?: string;
  submission_types?: string[];
  allowed_extensions?: string[];
  html_url?: string;
  assignment_group_id?: string | number;
  position?: number;
  published?: boolean;
  muted?: boolean;
  has_submitted_submissions?: boolean;
  locked_for_user?: boolean;
  lock_explanation?: string;
  needs_grading_count?: number;
  all_dates?: unknown[];
  external_tool_tag_attributes?: unknown;
  rubric?: unknown[];
  attachments?: CanvasAttachment[];
};

export type CanvasAttachment = {
  id: string | number;
  display_name?: string;
  filename?: string;
  content_type?: string;
  url?: string;
  size?: number;
};

export async function handleAssignmentsCommand(
  argv: string[],
  options: { format: OutputFormat }
): Promise<number> {
  const [subcommand] = argv;

  try {
    if (subcommand === "list") {
      return await listAssignments(argv.slice(1), options);
    }
    if (subcommand === "show") {
      return await showAssignment(argv.slice(1), options);
    }
    if (subcommand === "export") {
      return await exportAssignment(argv.slice(1), options);
    }

    await writeOutput(
      {
        ok: false,
        error: {
          code: "UNKNOWN_COMMAND",
          message: `Unknown assignments command: ${argv.join(" ")}`,
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

async function listAssignments(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(
    argv,
    "--course-id",
    "Usage: canvas assignments list --course-id <course-id>"
  );
  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasAssignment[]>(
    `/api/v1/courses/${courseId}/assignments`,
    {
      query: assignmentListQuery(argv),
      ...pageOptions(argv)
    }
  );

  await writeOutput(
    {
      ok: true,
      data: response.data.map(normalizeAssignment),
      meta: { ...response.meta, baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

async function showAssignment(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(
    argv,
    "--course-id",
    "Usage: canvas assignments show --course-id <course-id> --assignment-id <assignment-id>"
  );
  const assignmentId =
    flagValue(argv, "--assignment-id") ??
    positionalArgs(argv)[0] ??
    missing("Usage: canvas assignments show --course-id <course-id> --assignment-id <assignment-id>");

  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasAssignment>(
    `/api/v1/courses/${courseId}/assignments/${assignmentId}`,
    { query: assignmentShowQuery(argv) }
  );

  await writeOutput(
    {
      ok: true,
      data: normalizeAssignment(response.data),
      meta: { ...response.meta, baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

async function exportAssignment(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(
    argv,
    "--course-id",
    "Usage: canvas assignments export --course-id <course-id> --assignment-id <assignment-id> --out <dir>"
  );
  const assignmentId =
    flagValue(argv, "--assignment-id") ??
    positionalArgs(argv)[0] ??
    missing("Usage: canvas assignments export --course-id <course-id> --assignment-id <assignment-id> --out <dir>");
  const outDir = requiredFlag(
    argv,
    "--out",
    "Usage: canvas assignments export --course-id <course-id> --assignment-id <assignment-id> --out <dir>"
  );

  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasAssignment>(
    `/api/v1/courses/${courseId}/assignments/${assignmentId}`,
    { query: { "include[]": ["all_dates", "description", "submission"] } }
  );
  const assignment = normalizeAssignment(response.data);

  await mkdir(outDir, { recursive: true });
  const jsonPath = join(outDir, `assignment-${assignment.id}.json`);
  const markdownPath = join(outDir, `assignment-${assignment.id}.md`);
  await writeFile(jsonPath, `${JSON.stringify(assignment, null, 2)}\n`, "utf8");
  await writeFile(markdownPath, assignmentMarkdown(assignment), "utf8");

  await writeOutput(
    {
      ok: true,
      data: {
        assignment,
        written: [
          { path: jsonPath, kind: "assignment-json" },
          { path: markdownPath, kind: "assignment-markdown" }
        ]
      },
      meta: { baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

export function assignmentListQuery(argv: string[]) {
  return {
    bucket: flagValue(argv, "--bucket"),
    search_term: flagValue(argv, "--search"),
    order_by: flagValue(argv, "--order-by"),
    "include[]": csvFlag(argv, "--include"),
    per_page: flagValue(argv, "--page-size")
  };
}

export function assignmentShowQuery(argv: string[]) {
  return {
    "include[]": csvFlag(argv, "--include") ?? ["all_dates", "description"]
  };
}

export function normalizeAssignment(assignment: CanvasAssignment) {
  return {
    id: String(assignment.id),
    name: assignment.name,
    description: assignment.description,
    dueAt: assignment.due_at,
    unlockAt: assignment.unlock_at,
    lockAt: assignment.lock_at,
    pointsPossible: assignment.points_possible,
    gradingType: assignment.grading_type,
    submissionTypes: assignment.submission_types,
    allowedExtensions: assignment.allowed_extensions,
    htmlUrl: assignment.html_url,
    assignmentGroupId:
      assignment.assignment_group_id === undefined ? undefined : String(assignment.assignment_group_id),
    position: assignment.position,
    published: assignment.published,
    muted: assignment.muted,
    hasSubmittedSubmissions: assignment.has_submitted_submissions,
    lockedForUser: assignment.locked_for_user,
    lockExplanation: assignment.lock_explanation,
    needsGradingCount: assignment.needs_grading_count,
    allDates: assignment.all_dates,
    externalToolTagAttributes: assignment.external_tool_tag_attributes,
    rubric: assignment.rubric,
    attachments: assignment.attachments?.map(normalizeAttachment)
  };
}

export function normalizeAttachment(attachment: CanvasAttachment) {
  return {
    id: String(attachment.id),
    displayName: attachment.display_name,
    filename: attachment.filename,
    contentType: attachment.content_type,
    url: attachment.url,
    size: attachment.size
  };
}

function assignmentMarkdown(assignment: ReturnType<typeof normalizeAssignment>): string {
  const lines = [
    `# ${assignment.name ?? `Assignment ${assignment.id}`}`,
    "",
    `- id: ${assignment.id}`,
    `- due: ${assignment.dueAt ?? "none"}`,
    `- points: ${assignment.pointsPossible ?? "none"}`,
    `- html: ${assignment.htmlUrl ?? "none"}`,
    "",
    "## Description",
    "",
    assignment.description ?? ""
  ];
  return `${lines.join("\n")}\n`;
}

function missing(message: string): never {
  throw new Error(message);
}
