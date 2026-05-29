import { describe, expect, it } from "vitest";
import { normalizePage, pagesListQuery } from "./pages.js";

describe("pagesListQuery", () => {
  it("maps page search flags", () => {
    expect(pagesListQuery(["--search", "syllabus", "--sort", "title"])).toMatchObject({
      search_term: "syllabus",
      sort: "title"
    });
  });
});

describe("normalizePage", () => {
  it("normalizes Canvas page fields", () => {
    expect(
      normalizePage({
        page_id: 9,
        url: "syllabus",
        title: "Syllabus",
        html_url: "https://canvas.example.edu/courses/1/pages/syllabus",
        locked_for_user: false
      })
    ).toMatchObject({
      id: "9",
      url: "syllabus",
      title: "Syllabus",
      htmlUrl: "https://canvas.example.edu/courses/1/pages/syllabus",
      lockedForUser: false
    });
  });
});
