import { describe, expect, it } from "vitest";
import { courseListQuery, normalizeCourse } from "./courses.js";

describe("courseListQuery", () => {
  it("uses active enrollment state for --active", () => {
    expect(courseListQuery(["--active"])).toMatchObject({
      enrollment_state: "active"
    });
  });

  it("uses explicit enrollment state when provided", () => {
    expect(courseListQuery(["--enrollment-state", "completed"])).toMatchObject({
      enrollment_state: "completed"
    });
  });
});

describe("normalizeCourse", () => {
  it("normalizes Canvas course field names", () => {
    expect(
      normalizeCourse({
        id: "123",
        name: "Algorithms",
        course_code: "COMS 3134",
        workflow_state: "available",
        enrollment_term_id: "9",
        term: {
          id: "9",
          name: "Spring 2026",
          start_at: "2026-01-10T00:00:00Z",
          end_at: "2026-05-10T00:00:00Z"
        },
        enrollments: [{ type: "student", role: "StudentEnrollment", enrollment_state: "active" }]
      })
    ).toEqual({
      id: "123",
      name: "Algorithms",
      courseCode: "COMS 3134",
      workflowState: "available",
      enrollmentTermId: "9",
      term: {
        id: "9",
        name: "Spring 2026",
        startAt: "2026-01-10T00:00:00Z",
        endAt: "2026-05-10T00:00:00Z"
      },
      enrollments: [{ type: "student", role: "StudentEnrollment", state: "active" }]
    });
  });
});
