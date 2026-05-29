import { describe, expect, it } from "vitest";
import {
  authHelpText,
  chooseSchool,
  resolveSchoolFromArgs,
  tokenFromArgs,
  tokenSetupForSchool
} from "./auth.js";
import type { PromptIO } from "../core/prompt.js";

describe("chooseSchool", () => {
  it("confirms a single matching school", async () => {
    const prompt = fakePrompt(["Columbia", "y"]);

    await expect(chooseSchool(prompt, () => {})).resolves.toEqual({
      name: "Columbia University (CourseWorks)",
      url: "https://courseworks2.columbia.edu"
    });
  });

  it("uses custom school flow when single match is rejected", async () => {
    const prompt = fakePrompt(["Columbia", "n", "My School", "https://canvas.example.edu/"]);

    await expect(chooseSchool(prompt, () => {})).resolves.toEqual({
      name: "My School",
      url: "https://canvas.example.edu"
    });
  });
});

describe("authHelpText", () => {
  it("documents non-interactive school search", () => {
    expect(authHelpText()).toContain('canvas auth schools search "Berkeley"');
    expect(authHelpText()).toContain("--token-env");
  });
});

describe("resolveSchoolFromArgs", () => {
  it("resolves a known school from a query", () => {
    expect(resolveSchoolFromArgs(["--school", "Columbia"])).toEqual({
      name: "Columbia University (CourseWorks)",
      url: "https://courseworks2.columbia.edu"
    });
  });

  it("uses a custom school URL", () => {
    expect(
      resolveSchoolFromArgs([
        "--school-name",
        "My School",
        "--school-url",
        "https://canvas.example.edu/"
      ])
    ).toEqual({
      name: "My School",
      url: "https://canvas.example.edu"
    });
  });

  it("rejects ambiguous school queries", () => {
    expect(() => resolveSchoolFromArgs(["--school", "University"])).toThrow("Multiple schools matched");
  });
});

describe("tokenFromArgs", () => {
  it("reads direct token flags", async () => {
    await expect(tokenFromArgs(["--token", "abc123"])).resolves.toBe("abc123");
  });

  it("reads token env flags", async () => {
    process.env.CANVAS_TEST_TOKEN = "env-token";
    await expect(tokenFromArgs(["--token-env", "CANVAS_TEST_TOKEN"])).resolves.toBe("env-token");
    delete process.env.CANVAS_TEST_TOKEN;
  });
});

describe("tokenSetupForSchool", () => {
  it("returns friendly setup details for agents to show users", () => {
    expect(
      tokenSetupForSchool({
        name: "University of California, Berkeley (bCourses)",
        url: "https://bcourses.berkeley.edu"
      })
    ).toMatchObject({
      requiresToken: true,
      school: {
        baseUrl: "https://bcourses.berkeley.edu",
        settingsUrl: "https://bcourses.berkeley.edu/profile/settings"
      },
      tokenPurpose: "canvas-cli",
      nextCommands: {
        directToken:
          'canvas auth login --school "University of California, Berkeley (bCourses)" --token "paste-token-here"'
      }
    });
  });
});

function fakePrompt(answers: string[]): PromptIO {
  return {
    async question() {
      const answer = answers.shift();
      if (answer === undefined) {
        throw new Error("No fake prompt answer available.");
      }
      return answer;
    },
    close() {}
  };
}
