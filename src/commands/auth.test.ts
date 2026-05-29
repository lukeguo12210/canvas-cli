import { describe, expect, it } from "vitest";
import { chooseSchool } from "./auth.js";
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
