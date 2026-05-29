import { describe, expect, it } from "vitest";
import { filesListPath, filesListQuery, normalizeFile, normalizeFolder } from "./files.js";

describe("filesListPath", () => {
  it("uses course files by default", () => {
    expect(filesListPath(["--course-id", "123"])).toBe("/api/v1/courses/123/files");
  });

  it("prefers folder files when folder id is present", () => {
    expect(filesListPath(["--course-id", "123", "--folder-id", "9"])).toBe(
      "/api/v1/folders/9/files"
    );
  });
});

describe("filesListQuery", () => {
  it("maps file filters", () => {
    expect(filesListQuery(["--search", "slides", "--content-type", "application/pdf,text/plain"])).toMatchObject({
      search_term: "slides",
      "content_types[]": ["application/pdf", "text/plain"]
    });
  });
});

describe("normalizeFile", () => {
  it("normalizes Canvas file fields", () => {
    expect(
      normalizeFile({
        id: 44,
        folder_id: 2,
        display_name: "slides.pdf",
        content_type: "application/pdf",
        locked_for_user: false
      })
    ).toMatchObject({
      id: "44",
      folderId: "2",
      displayName: "slides.pdf",
      contentType: "application/pdf",
      lockedForUser: false
    });
  });
});

describe("normalizeFolder", () => {
  it("normalizes Canvas folder fields", () => {
    expect(
      normalizeFolder({
        id: 4,
        full_name: "course files/week 1",
        parent_folder_id: 1,
        files_count: 3
      })
    ).toMatchObject({
      id: "4",
      fullName: "course files/week 1",
      parentFolderId: "1",
      filesCount: 3
    });
  });
});
