import { describe, expect, it } from "vitest";
import { makeCustomSchool, searchSchools } from "./schools.js";

describe("school registry", () => {
  it("finds schools by name", () => {
    const results = searchSchools("Columbia");
    expect(results[0]).toEqual({
      name: "Columbia University (CourseWorks)",
      url: "https://courseworks2.columbia.edu"
    });
  });

  it("finds schools by URL", () => {
    const results = searchSchools("bcourses");
    expect(results[0]?.name).toBe("University of California, Berkeley (bCourses)");
  });

  it("normalizes custom school URLs", () => {
    expect(makeCustomSchool("Custom", "https://canvas.example.edu/")).toEqual({
      name: "Custom",
      url: "https://canvas.example.edu"
    });
  });
});
