import { describe, expect, it } from "vitest";
import { SKILLS_INSTALL_COMMAND, SKILLS_INSTALL_DISPLAY_COMMAND, skillsHelpText } from "./skills.js";

describe("SKILLS_INSTALL_COMMAND", () => {
  it("uses the GitHub source understood by the skills CLI", () => {
    expect(SKILLS_INSTALL_COMMAND.join(" ")).toBe(
      "npx skills add lukeguo12210/canvas-cli -g --skill * -y"
    );
    expect(SKILLS_INSTALL_DISPLAY_COMMAND).toBe(
      'npx skills add lukeguo12210/canvas-cli -g --skill "*" -y'
    );
  });
});

describe("skillsHelpText", () => {
  it("documents the install-skills alias", () => {
    expect(skillsHelpText()).toContain("canvas install-skills");
    expect(skillsHelpText()).toContain(SKILLS_INSTALL_DISPLAY_COMMAND);
  });
});
