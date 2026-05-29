import { describe, expect, it } from "vitest";
import { positionalArgs } from "./shared.js";

describe("positionalArgs", () => {
  it("keeps positionals and skips flag values", () => {
    expect(positionalArgs(["search", "algorithms", "--page-limit", "3"])).toEqual([
      "search",
      "algorithms"
    ]);
  });

  it("does not skip the value after a boolean flag", () => {
    expect(positionalArgs(["--active", "algorithms"])).toEqual(["algorithms"]);
  });
});
