import { describe, expect, it } from "vitest";
import path from "node:path";
import { resolveInside } from "./paths.js";

describe("resolveInside", () => {
  it("resolves a target inside the base directory", () => {
    expect(resolveInside("/tmp/canvas", "files/syllabus.pdf")).toBe(
      path.resolve("/tmp/canvas/files/syllabus.pdf")
    );
  });

  it("rejects path traversal", () => {
    expect(() => resolveInside("/tmp/canvas", "../secret.txt")).toThrow(
      "Path escapes target directory"
    );
  });
});
