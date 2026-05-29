import { spawn } from "node:child_process";
import { toErrorEnvelope } from "../core/errors.js";
import type { OutputFormat } from "../core/output.js";
import { writeOutput } from "../core/output.js";
import { hasFlag } from "./shared.js";

export const SKILLS_INSTALL_COMMAND = [
  "npx",
  "skills",
  "add",
  "lukeguo12210/canvas-cli",
  "-g",
  "--skill",
  "*",
  "-y"
] as const;

export const SKILLS_INSTALL_DISPLAY_COMMAND = 'npx skills add lukeguo12210/canvas-cli -g --skill "*" -y';

export async function handleSkillsCommand(
  argv: string[],
  options: { format: OutputFormat }
): Promise<number> {
  const [subcommand] = argv;

  try {
    if (subcommand === "install") {
      return await installSkills(argv.slice(1), options);
    }
    if (subcommand === "command") {
      return await printSkillsCommand(options);
    }
    if (subcommand === "status") {
      return await skillsStatus(options);
    }

    await writeOutput(
      {
        ok: false,
        error: {
          code: "UNKNOWN_COMMAND",
          message: `Unknown skills command: ${argv.join(" ")}`,
          retryable: false
        }
      },
      options
    );
    return 1;
  } catch (error) {
    await writeOutput(toErrorEnvelope(error), options);
    return 1;
  }
}

async function installSkills(argv: string[], options: { format: OutputFormat }): Promise<number> {
  if (hasFlag(argv, "--dry-run") || hasFlag(argv, "--print")) {
    return printSkillsCommand(options);
  }

  const code = await run(SKILLS_INSTALL_COMMAND[0], SKILLS_INSTALL_COMMAND.slice(1));
  if (code !== 0) {
    await writeOutput(
      {
        ok: false,
        error: {
          code: "SKILLS_INSTALL_FAILED",
          message: `Skills installer exited with code ${code}. Try: ${SKILLS_INSTALL_DISPLAY_COMMAND}`,
          retryable: true
        }
      },
      options
    );
    return code;
  }

  await writeOutput(
    {
      ok: true,
      data: {
        installed: true,
        command: SKILLS_INSTALL_DISPLAY_COMMAND,
        next: "Restart or reload your agent so it can discover the updated Canvas skills."
      },
      meta: {
        command: "skills install"
      }
    },
    options
  );
  return 0;
}

async function printSkillsCommand(options: { format: OutputFormat }): Promise<number> {
  await writeOutput(
    {
      ok: true,
      data: {
        command: SKILLS_INSTALL_DISPLAY_COMMAND,
        note: "Run this to install or update all Canvas agent skills from GitHub."
      },
      meta: {
        command: "skills command"
      }
    },
    options
  );
  return 0;
}

async function skillsStatus(options: { format: OutputFormat }): Promise<number> {
  await writeOutput(
    {
      ok: true,
      data: {
        installCommand: SKILLS_INSTALL_DISPLAY_COMMAND,
        skills: [
          "canvas-shared",
          "canvas-courses",
          "canvas-modules",
          "canvas-pages",
          "canvas-files",
          "canvas-assignments",
          "canvas-review"
        ],
        note: "Use canvas skills install to install/update these skills."
      },
      meta: {
        command: "skills status"
      }
    },
    options
  );
  return 0;
}

function run(command: string, args: readonly string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, [...args], {
      stdio: "inherit",
      shell: process.platform === "win32"
    });
    child.on("close", (code) => resolve(code ?? 1));
    child.on("error", () => resolve(1));
  });
}
