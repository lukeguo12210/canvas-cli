import { describe, expect, it } from "vitest";
import { moduleListQuery, normalizeModule, normalizeModuleItem } from "./modules.js";

describe("moduleListQuery", () => {
  it("maps comma-separated includes to Canvas include params", () => {
    expect(moduleListQuery(["--include", "items,content_details"])).toEqual({
      "include[]": ["items", "content_details"],
      per_page: undefined
    });
  });
});

describe("normalizeModule", () => {
  it("normalizes module and item field names", () => {
    expect(
      normalizeModule({
        id: 12,
        name: "Week 1",
        position: 1,
        state: "started",
        items_count: 1,
        items: [
          {
            id: 99,
            module_id: 12,
            title: "Lecture",
            type: "File",
            content_id: 123,
            html_url: "https://canvas.example.edu/courses/1/files/123"
          }
        ]
      })
    ).toMatchObject({
      id: "12",
      name: "Week 1",
      itemsCount: 1,
      items: [
        {
          id: "99",
          moduleId: "12",
          title: "Lecture",
          type: "File",
          contentId: "123",
          htmlUrl: "https://canvas.example.edu/courses/1/files/123"
        }
      ]
    });
  });
});

describe("normalizeModuleItem", () => {
  it("preserves item content details", () => {
    expect(
      normalizeModuleItem({
        id: "7",
        title: "Read me",
        type: "Page",
        page_url: "read-me",
        content_details: { points_possible: 10 }
      })
    ).toMatchObject({
      id: "7",
      title: "Read me",
      type: "Page",
      pageUrl: "read-me",
      contentDetails: { points_possible: 10 }
    });
  });
});
