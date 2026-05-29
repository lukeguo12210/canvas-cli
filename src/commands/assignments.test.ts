import { describe, expect, it } from "vitest";
import { assignmentListQuery, normalizeAssignment } from "./assignments.js";

describe("assignmentListQuery", () => {
  it("maps search and bucket flags", () => {
    expect(assignmentListQuery(["--bucket", "upcoming", "--search", "project"])).toMatchObject({
      bucket: "upcoming",
      search_term: "project"
    });
  });
});

describe("normalizeAssignment", () => {
  it("normalizes assignment fields and attachments", () => {
    expect(
      normalizeAssignment({
        id: 5,
        name: "Homework",
        due_at: "2026-05-30T00:00:00Z",
        points_possible: 100,
        submission_types: ["online_upload"],
        assignment_group_id: 8,
        attachments: [{ id: 9, display_name: "spec.pdf", content_type: "application/pdf" }]
      })
    ).toMatchObject({
      id: "5",
      name: "Homework",
      dueAt: "2026-05-30T00:00:00Z",
      pointsPossible: 100,
      submissionTypes: ["online_upload"],
      assignmentGroupId: "8",
      attachments: [{ id: "9", displayName: "spec.pdf", contentType: "application/pdf" }]
    });
  });
});
