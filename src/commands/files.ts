import { mkdir, writeFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { CanvasCliError, toErrorEnvelope } from "../core/errors.js";
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

export type CanvasFile = {
  id: string | number;
  uuid?: string;
  folder_id?: string | number;
  display_name?: string;
  filename?: string;
  content_type?: string;
  url?: string;
  size?: number;
  created_at?: string;
  updated_at?: string;
  modified_at?: string;
  unlock_at?: string | null;
  locked?: boolean;
  hidden?: boolean;
  locked_for_user?: boolean;
  lock_explanation?: string;
  thumbnail_url?: string;
  preview_url?: string;
  mime_class?: string;
};

export type CanvasFolder = {
  id: string | number;
  name?: string;
  full_name?: string;
  context_id?: string | number;
  context_type?: string;
  parent_folder_id?: string | number | null;
  files_count?: number;
  folders_count?: number;
  position?: number;
  locked?: boolean;
  hidden?: boolean;
  locked_for_user?: boolean;
  for_submissions?: boolean;
};

export async function handleFilesCommand(
  argv: string[],
  options: { format: OutputFormat }
): Promise<number> {
  const [subcommand] = argv;

  try {
    if (subcommand === "list") {
      return await listFiles(argv.slice(1), options);
    }
    if (subcommand === "show") {
      return await showFile(argv.slice(1), options);
    }
    if (subcommand === "download") {
      return await downloadFile(argv.slice(1), options);
    }
    if (subcommand === "download-linked") {
      return await downloadLinkedFiles(argv.slice(1), options);
    }

    await writeOutput(
      {
        ok: false,
        error: {
          code: "UNKNOWN_COMMAND",
          message: `Unknown files command: ${argv.join(" ")}`,
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

export async function handleFoldersCommand(
  argv: string[],
  options: { format: OutputFormat }
): Promise<number> {
  const [subcommand] = argv;

  try {
    if (subcommand === "list") {
      return await listFolders(argv.slice(1), options);
    }
    if (subcommand === "path") {
      return await folderPath(argv.slice(1), options);
    }

    await writeOutput(
      {
        ok: false,
        error: {
          code: "UNKNOWN_COMMAND",
          message: `Unknown folders command: ${argv.join(" ")}`,
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

async function listFiles(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const path = filesListPath(argv);
  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasFile[]>(path, {
    query: filesListQuery(argv),
    ...pageOptions(argv)
  });

  await writeOutput(
    {
      ok: true,
      data: response.data.map(normalizeFile),
      meta: { ...response.meta, baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

async function showFile(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const fileId =
    flagValue(argv, "--file-id") ??
    positionalArgs(argv)[0] ??
    missing("Usage: canvas files show <file-id>");
  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasFile>(`/api/v1/files/${fileId}`, {
    query: { "include[]": csvFlag(argv, "--include") }
  });

  await writeOutput(
    {
      ok: true,
      data: normalizeFile(response.data),
      meta: { ...response.meta, baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

async function downloadFile(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const fileId =
    flagValue(argv, "--file-id") ??
    positionalArgs(argv)[0] ??
    missing("Usage: canvas files download <file-id> --out <dir>");
  const outDir = requiredFlag(argv, "--out", "Usage: canvas files download <file-id> --out <dir>");
  const { client, profile } = await activeCanvas();
  const fileResponse = await client.get<CanvasFile>(`/api/v1/files/${fileId}`);
  const file = normalizeFile(fileResponse.data);
  if (!file.url) {
    throw new CanvasCliError("FILE_URL_UNAVAILABLE", "Canvas did not return a download URL for this file.");
  }

  const download = await client.download(file.url);
  const filename = safeFilename(download.filename ?? file.displayName ?? file.filename ?? `file-${file.id}`);
  const filePath = safeJoin(outDir, filename);
  await mkdir(outDir, { recursive: true });
  await writeFile(filePath, download.data);

  await writeOutput(
    {
      ok: true,
      data: {
        file,
        written: {
          path: filePath,
          bytes: download.data.byteLength,
          contentType: download.contentType
        }
      },
      meta: { baseUrl: profile.baseUrl, download: download.meta }
    },
    options
  );
  return 0;
}

async function downloadLinkedFiles(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(
    argv,
    "--course-id",
    "Usage: canvas files download-linked --course-id <course-id> --out <dir>"
  );
  const outDir = requiredFlag(
    argv,
    "--out",
    "Usage: canvas files download-linked --course-id <course-id> --out <dir>"
  );
  const { client, profile } = await activeCanvas();
  const [moduleItems, assignments] = await Promise.all([
    client.get<Array<{ type?: string; content_id?: string | number; title?: string }>>(
      `/api/v1/courses/${courseId}/modules/items`,
      { query: { per_page: 100 }, pageAll: true }
    ).catch(() => ({ data: [] })),
    client.get<Array<{ attachments?: CanvasFile[] }>>(`/api/v1/courses/${courseId}/assignments`, {
      query: { "include[]": ["description"], per_page: 100 },
      pageAll: true
    }).catch(() => ({ data: [] }))
  ]);

  const ids = new Set<string>();
  for (const item of moduleItems.data) {
    if (item.type === "File" && item.content_id !== undefined) {
      ids.add(String(item.content_id));
    }
  }
  for (const assignment of assignments.data) {
    for (const attachment of assignment.attachments ?? []) {
      ids.add(String(attachment.id));
    }
  }

  const written: Array<{ id: string; path?: string; error?: string }> = [];
  for (const id of ids) {
    try {
      const fileResponse = await client.get<CanvasFile>(`/api/v1/files/${id}`);
      const file = normalizeFile(fileResponse.data);
      if (!file.url) {
        written.push({ id, error: "FILE_URL_UNAVAILABLE" });
        continue;
      }
      const download = await client.download(file.url);
      const filename = safeFilename(download.filename ?? file.displayName ?? file.filename ?? `file-${id}`);
      const filePath = safeJoin(outDir, filename);
      await mkdir(outDir, { recursive: true });
      await writeFile(filePath, download.data);
      written.push({ id, path: filePath });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      written.push({ id, error: message });
    }
  }

  await writeOutput(
    {
      ok: true,
      data: { count: ids.size, written },
      meta: { baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

async function listFolders(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(
    argv,
    "--course-id",
    "Usage: canvas folders list --course-id <course-id>"
  );
  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasFolder[]>(`/api/v1/courses/${courseId}/folders`, {
    query: { per_page: flagValue(argv, "--page-size") },
    ...pageOptions(argv)
  });

  await writeOutput(
    {
      ok: true,
      data: response.data.map(normalizeFolder),
      meta: { ...response.meta, baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

async function folderPath(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(
    argv,
    "--course-id",
    "Usage: canvas folders path --course-id <course-id> --path <path>"
  );
  const folderPathValue = requiredFlag(
    argv,
    "--path",
    "Usage: canvas folders path --course-id <course-id> --path <path>"
  );
  const { client, profile } = await activeCanvas();
  const encodedPath = folderPathValue
    .split("/")
    .filter(Boolean)
    .map(encodeURIComponent)
    .join("/");
  const response = await client.get<CanvasFolder[]>(
    `/api/v1/courses/${courseId}/folders/by_path/${encodedPath}`
  );

  await writeOutput(
    {
      ok: true,
      data: response.data.map(normalizeFolder),
      meta: { ...response.meta, baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}

export function filesListPath(argv: string[]): string {
  const groupId = flagValue(argv, "--group-id");
  if (groupId) {
    return `/api/v1/groups/${groupId}/files`;
  }
  const folderId = flagValue(argv, "--folder-id");
  if (folderId) {
    return `/api/v1/folders/${folderId}/files`;
  }
  const courseId = requiredFlag(argv, "--course-id", "Usage: canvas files list --course-id <course-id>");
  return `/api/v1/courses/${courseId}/files`;
}

export function filesListQuery(argv: string[]) {
  return {
    search_term: flagValue(argv, "--search"),
    sort: flagValue(argv, "--sort"),
    "content_types[]": csvFlag(argv, "--content-type"),
    "include[]": csvFlag(argv, "--include"),
    per_page: flagValue(argv, "--page-size")
  };
}

export function normalizeFile(file: CanvasFile) {
  return {
    id: String(file.id),
    uuid: file.uuid,
    folderId: file.folder_id === undefined ? undefined : String(file.folder_id),
    displayName: file.display_name,
    filename: file.filename,
    contentType: file.content_type,
    url: file.url,
    size: file.size,
    createdAt: file.created_at,
    updatedAt: file.updated_at,
    modifiedAt: file.modified_at,
    unlockAt: file.unlock_at,
    locked: file.locked,
    hidden: file.hidden,
    lockedForUser: file.locked_for_user,
    lockExplanation: file.lock_explanation,
    thumbnailUrl: file.thumbnail_url,
    previewUrl: file.preview_url,
    mimeClass: file.mime_class
  };
}

export function normalizeFolder(folder: CanvasFolder) {
  return {
    id: String(folder.id),
    name: folder.name,
    fullName: folder.full_name,
    contextId: folder.context_id === undefined ? undefined : String(folder.context_id),
    contextType: folder.context_type,
    parentFolderId: folder.parent_folder_id === undefined ? undefined : String(folder.parent_folder_id),
    filesCount: folder.files_count,
    foldersCount: folder.folders_count,
    position: folder.position,
    locked: folder.locked,
    hidden: folder.hidden,
    lockedForUser: folder.locked_for_user,
    forSubmissions: folder.for_submissions
  };
}

function safeFilename(input: string): string {
  const name = basename(input).replace(/[/:\\]/g, "_").trim();
  return name || "canvas-file";
}

function safeJoin(outDir: string, filename: string): string {
  const base = resolve(outDir);
  const target = resolve(base, filename);
  if (!target.startsWith(`${base}/`) && target !== base) {
    throw new CanvasCliError("INVALID_OUTPUT_PATH", "Refusing to write outside the output directory.");
  }
  return target;
}

function missing(message: string): never {
  throw new Error(message);
}
