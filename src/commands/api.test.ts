import { describe, expect, it } from "vitest";
import { parseParams } from "./api.js";

describe("parseParams", () => {
  it("accepts JSON query params", () => {
    expect(parseParams('{"include[]":["items","content_details"],"per_page":100}')).toEqual({
      "include[]": ["items", "content_details"],
      per_page: 100
    });
  });

  it("rejects nested objects", () => {
    expect(() => parseParams('{"nested":{"bad":true}}')).toThrow("Unsupported query value");
  });
});
