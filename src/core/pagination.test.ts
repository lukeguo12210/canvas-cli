import { describe, expect, it } from "vitest";
import { parseLinkHeader } from "./pagination.js";

describe("parseLinkHeader", () => {
  it("parses Canvas pagination link headers", () => {
    const parsed = parseLinkHeader(
      '<https://canvas.example.edu/api/v1/courses?page=2>; rel="next", <https://canvas.example.edu/api/v1/courses?page=1>; rel="current", <https://canvas.example.edu/api/v1/courses?page=4>; rel="last"'
    );

    expect(parsed.next).toBe("https://canvas.example.edu/api/v1/courses?page=2");
    expect(parsed.current).toBe("https://canvas.example.edu/api/v1/courses?page=1");
    expect(parsed.last).toBe("https://canvas.example.edu/api/v1/courses?page=4");
  });

  it("returns an empty object for absent headers", () => {
    expect(parseLinkHeader(null)).toEqual({});
  });
});
