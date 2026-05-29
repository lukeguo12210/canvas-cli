import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { toErrorEnvelope } from "../core/errors.js";
import type { OutputFormat } from "../core/output.js";
import { writeOutput } from "../core/output.js";
import { normalizeAssignment, type CanvasAssignment } from "./assignments.js";
import { normalizeCourse, type CanvasCourse } from "./courses.js";
import { normalizeFile, type CanvasFile } from "./files.js";
import { normalizeModule, type CanvasModule } from "./modules.js";
import { normalizePage, type CanvasPage } from "./pages.js";
import { activeCanvas, hasFlag, requiredFlag } from "./shared.js";
import { normalizeTab, type CanvasTab } from "./tabs.js";

export async function handleReviewCommand(
  argv: string[],
  options: { format: OutputFormat }
): Promise<number> {
  const [subcommand] = argv;

  try {
    if (subcommand === "pack") {
      return await reviewPack(argv.slice(1), options);
    }

    await writeOutput(
      {
        ok: false,
        error: {
          code: "UNKNOWN_COMMAND",
          message: `Unknown review command: ${argv.join(" ")}`,
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

async function reviewPack(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = requiredFlag(
    argv,
    "--course-id",
    "Usage: canvas review pack --course-id <course-id> --out <dir>"
  );
  const outDir = requiredFlag(argv, "--out", "Usage: canvas review pack --course-id <course-id> --out <dir>");
  const includeAllFiles = hasFlag(argv, "--include-all-files");

  const { client, profile } = await activeCanvas();
  const [course, tabs, modules, assignments, pages, files] = await Promise.all([
    client.get<CanvasCourse>(`/api/v1/courses/${courseId}`, {
      query: { "include[]": ["term", "course_image"] }
    }),
    client.get<CanvasTab[]>(`/api/v1/courses/${courseId}/tabs`).catch(() => ({ data: [] })),
    client
      .get<CanvasModule[]>(`/api/v1/courses/${courseId}/modules`, {
        query: { "include[]": ["items", "content_details"], per_page: 100 },
        pageAll: true
      })
      .catch(() => ({ data: [] })),
    client
      .get<CanvasAssignment[]>(`/api/v1/courses/${courseId}/assignments`, {
        query: { per_page: 100 },
        pageAll: true
      })
      .catch(() => ({ data: [] })),
    client
      .get<CanvasPage[]>(`/api/v1/courses/${courseId}/pages`, {
        query: { per_page: 100 },
        pageAll: true
      })
      .catch(() => ({ data: [] })),
    includeAllFiles
      ? client
          .get<CanvasFile[]>(`/api/v1/courses/${courseId}/files`, {
            query: { per_page: 100 },
            pageAll: true
          })
          .catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] })
  ]);

  const pack = {
    generatedAt: new Date().toISOString(),
    baseUrl: profile.baseUrl,
    course: normalizeCourse(course.data),
    tabs: tabs.data.map(normalizeTab),
    modules: modules.data.map(normalizeModule),
    assignments: assignments.data.map(normalizeAssignment),
    pages: pages.data.map(normalizePage),
    files: files.data.map(normalizeFile),
    notes: [
      "This review pack preserves Canvas IDs and visible course structure.",
      includeAllFiles
        ? "All visible course files metadata was included; file bytes are not downloaded by this command yet."
        : "All-files metadata is omitted by default. Re-run with --include-all-files to include visible file metadata."
    ]
  };

  await mkdir(outDir, { recursive: true });
  const manifestPath = join(outDir, "manifest.json");
  const coursePath = join(outDir, "course.json");
  const modulesPath = join(outDir, "modules.json");
  const assignmentsPath = join(outDir, "assignments.json");
  const pagesPath = join(outDir, "pages.json");
  await Promise.all([
    writeFile(manifestPath, `${JSON.stringify(pack, null, 2)}\n`, "utf8"),
    writeFile(coursePath, `${JSON.stringify(pack.course, null, 2)}\n`, "utf8"),
    writeFile(modulesPath, `${JSON.stringify(pack.modules, null, 2)}\n`, "utf8"),
    writeFile(assignmentsPath, `${JSON.stringify(pack.assignments, null, 2)}\n`, "utf8"),
    writeFile(pagesPath, `${JSON.stringify(pack.pages, null, 2)}\n`, "utf8")
  ]);

  await writeOutput(
    {
      ok: true,
      data: {
        course: pack.course,
        counts: {
          tabs: pack.tabs.length,
          modules: pack.modules.length,
          assignments: pack.assignments.length,
          pages: pack.pages.length,
          files: pack.files.length
        },
        written: [
          { path: manifestPath, kind: "manifest" },
          { path: coursePath, kind: "course-json" },
          { path: modulesPath, kind: "modules-json" },
          { path: assignmentsPath, kind: "assignments-json" },
          { path: pagesPath, kind: "pages-json" }
        ]
      },
      meta: { baseUrl: profile.baseUrl }
    },
    options
  );
  return 0;
}
