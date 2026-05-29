import { describe, expect, it } from "vitest";
import { normalizeTab } from "./tabs.js";

describe("normalizeTab", () => {
  it("normalizes Canvas tab field names", () => {
    expect(
      normalizeTab({
        id: "modules",
        label: "Modules",
        type: "internal",
        position: 2,
        hidden: false,
        visibility: "public",
        html_url: "/courses/123/modules",
        full_url: "https://canvas.example.edu/courses/123/modules"
      })
    ).toEqual({
      id: "modules",
      label: "Modules",
      type: "internal",
      position: 2,
      hidden: false,
      visibility: "public",
      htmlUrl: "/courses/123/modules",
      fullUrl: "https://canvas.example.edu/courses/123/modules"
    });
  });
});
