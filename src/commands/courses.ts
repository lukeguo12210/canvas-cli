import { toErrorEnvelope } from "../core/errors.js";
import type { OutputFormat } from "../core/output.js";
import { writeOutput } from "../core/output.js";
import { activeCanvas, flagValue, hasFlag, pageOptions, positionalArgs } from "./shared.js";

export type CanvasCourse = {
  id: string;
  name?: string;
  course_code?: string;
  workflow_state?: string;
  enrollment_term_id?: string;
  term?: {
    id?: string;
    name?: string;
    start_at?: string;
    end_at?: string;
  };
  enrollments?: Array<{
    type?: string;
    role?: string;
    enrollment_state?: string;
  }>;
};

export async function handleCoursesCommand(
  argv: string[],
  options: { format: OutputFormat }
): Promise<number> {
  const [subcommand] = argv;

  try {
    if (subcommand === "list") {
      return await listCourses(argv.slice(1), options);
    }
    if (subcommand === "search") {
      return await searchCourses(argv.slice(1), options);
    }
    if (subcommand === "show") {
      return await showCourse(argv.slice(1), options);
    }
    if (subcommand === "overview") {
      return await overviewCourse(argv.slice(1), options);
    }

    await writeOutput(
      {
        ok: false,
        error: {
          code: "UNKNOWN_COMMAND",
          message: `Unknown courses command: ${argv.join(" ")}`,
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

async function listCourses(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasCourse[]>("/api/v1/courses", {
    query: courseListQuery(argv),
    ...pageOptions(argv)
  });

  await writeOutput(
    {
      ok: true,
      data: response.data.map(normalizeCourse),
      meta: {
        ...response.meta,
        baseUrl: profile.baseUrl
      }
    },
    options
  );
  return 0;
}

async function searchCourses(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const query = positionalArgs(argv).join(" ").trim();
  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasCourse[]>("/api/v1/courses", {
    query: courseListQuery(["--active"]),
    pageAll: true
  });

  const matches = response.data
    .map(normalizeCourse)
    .filter((course) => {
      const haystack = `${course.name ?? ""} ${course.courseCode ?? ""}`.toLowerCase();
      return haystack.includes(query.toLowerCase());
    });

  await writeOutput(
    {
      ok: true,
      data: matches,
      meta: {
        ...response.meta,
        baseUrl: profile.baseUrl,
        query
      }
    },
    options
  );
  return 0;
}

async function showCourse(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = positionalArgs(argv)[0];
  if (!courseId) {
    throw new Error("Usage: canvas courses show <course-id>");
  }

  const { client, profile } = await activeCanvas();
  const response = await client.get<CanvasCourse>(`/api/v1/courses/${courseId}`, {
    query: {
      "include[]": ["term", "course_image", "total_scores", "teachers"]
    }
  });

  await writeOutput(
    {
      ok: true,
      data: normalizeCourse(response.data),
      meta: {
        ...response.meta,
        baseUrl: profile.baseUrl
      }
    },
    options
  );
  return 0;
}

async function overviewCourse(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const courseId = positionalArgs(argv)[0];
  if (!courseId) {
    throw new Error("Usage: canvas courses overview <course-id>");
  }

  const { client, profile } = await activeCanvas();
  const [course, tabs, modules, assignments] = await Promise.all([
    client.get<CanvasCourse>(`/api/v1/courses/${courseId}`, {
      query: { "include[]": ["term", "course_image"] }
    }),
    client.get<Array<{ id: string; label?: string; visibility?: string }>>(
      `/api/v1/courses/${courseId}/tabs`
    ),
    client.get<Array<{ id: string; name?: string; position?: number }>>(
      `/api/v1/courses/${courseId}/modules`,
      { query: { per_page: 100 } }
    ),
    client.get<Array<{ id: string; name?: string; due_at?: string }>>(
      `/api/v1/courses/${courseId}/assignments`,
      { query: { bucket: "upcoming", per_page: 20 } }
    )
  ]);

  await writeOutput(
    {
      ok: true,
      data: {
        course: normalizeCourse(course.data),
        tabs: tabs.data,
        setup: {
          hasModules: modules.data.length > 0,
          hasAssignments: assignments.data.length > 0,
          hasFilesTab: tabs.data.some((tab) => tab.id === "files"),
          isModuleHeavy: modules.data.length > 0
        },
        counts: {
          tabs: tabs.data.length,
          modules: modules.data.length,
          upcomingAssignments: assignments.data.length
        },
        modules: modules.data.map((module) => ({
          id: module.id,
          name: module.name,
          position: module.position
        })),
        upcomingAssignments: assignments.data.map((assignment) => ({
          id: assignment.id,
          name: assignment.name,
          dueAt: assignment.due_at
        }))
      },
      meta: {
        baseUrl: profile.baseUrl,
        request: {
          method: "GET",
          path: `/api/v1/courses/${courseId}/overview`
        }
      }
    },
    options
  );
  return 0;
}

export function courseListQuery(argv: string[]) {
  return {
    enrollment_state: hasFlag(argv, "--active") ? "active" : flagValue(argv, "--enrollment-state"),
    state: flagValue(argv, "--state"),
    per_page: flagValue(argv, "--page-size"),
    "include[]": ["term", "total_scores"]
  };
}

export function normalizeCourse(course: CanvasCourse) {
  return {
    id: String(course.id),
    name: course.name,
    courseCode: course.course_code,
    workflowState: course.workflow_state,
    enrollmentTermId: course.enrollment_term_id,
    term: course.term
      ? {
          id: course.term.id,
          name: course.term.name,
          startAt: course.term.start_at,
          endAt: course.term.end_at
        }
      : undefined,
    enrollments: course.enrollments?.map((enrollment) => ({
      type: enrollment.type,
      role: enrollment.role,
      state: enrollment.enrollment_state
    }))
  };
}
