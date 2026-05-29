import { writeOutput } from "../core/output.js";
import type { OutputFormat } from "../core/output.js";
import { handleAuthCommand } from "../commands/auth.js";
import { handleApiCommand } from "../commands/api.js";
import { handleAssignmentsCommand } from "../commands/assignments.js";
import { handleConfigCommand } from "../commands/config.js";
import { handleCoursesCommand } from "../commands/courses.js";
import { handleFilesCommand, handleFoldersCommand } from "../commands/files.js";
import { handleMeCommand } from "../commands/me.js";
import { handleModulesCommand } from "../commands/modules.js";
import { handlePagesCommand } from "../commands/pages.js";
import { handleReviewCommand } from "../commands/review.js";
import { handleTabsCommand } from "../commands/tabs.js";

const VERSION = "0.0.2";

function helpText(): string {
  return `canvas — Canvas LMS CLI for students and agents.

USAGE:
  canvas <command> [options]

COMMANDS:
  auth login        Interactive Canvas PAT setup
  auth status       Show redacted auth status
  auth logout       Remove local Canvas auth config
  config show       Show redacted local config
  me                Show current Canvas user profile
  courses list      List active Canvas courses
  courses overview  Summarize course setup
  tabs list         List course tabs
  modules list      List course modules
  modules items     List module items
  assignments list  List course assignments
  pages list        List course pages
  files list        List course files
  folders list      List course folders
  review pack       Create a local course review pack
  api get           Raw read-only Canvas API GET
  version           Print CLI version

FLAGS:
  -h, --help        Show help
  --format <fmt>    Output format: json | pretty | table | ndjson

MVP STATUS:
  Read-only student commands are available for auth, courses, tabs, modules,
  assignments, pages, files, folders, review packs, and raw GET.
`;
}

async function main(argv: string[]): Promise<number> {
  const parsed = parseGlobalOptions(argv);
  const [command] = parsed.argv;

  if (!command || command === "--help" || command === "-h" || command === "help") {
    process.stdout.write(helpText());
    return 0;
  }

  if (command === "version" || command === "--version" || command === "-v") {
    await writeOutput(
      {
        ok: true,
        data: { version: VERSION },
        meta: { command: "version" }
      },
      { format: parsed.format === "json" ? "json" : "pretty" }
    );
    return 0;
  }

  if (command === "auth") {
    return handleAuthCommand(parsed.argv.slice(1), { format: parsed.format });
  }

  if (command === "config") {
    return handleConfigCommand(parsed.argv.slice(1), { format: parsed.format });
  }

  if (command === "me") {
    return handleMeCommand({ format: parsed.format });
  }

  if (command === "courses") {
    return handleCoursesCommand(parsed.argv.slice(1), { format: parsed.format });
  }

  if (command === "tabs") {
    return handleTabsCommand(parsed.argv.slice(1), { format: parsed.format });
  }

  if (command === "modules") {
    return handleModulesCommand(parsed.argv.slice(1), { format: parsed.format });
  }

  if (command === "assignments") {
    return handleAssignmentsCommand(parsed.argv.slice(1), { format: parsed.format });
  }

  if (command === "pages") {
    return handlePagesCommand(parsed.argv.slice(1), { format: parsed.format });
  }

  if (command === "files") {
    return handleFilesCommand(parsed.argv.slice(1), { format: parsed.format });
  }

  if (command === "folders") {
    return handleFoldersCommand(parsed.argv.slice(1), { format: parsed.format });
  }

  if (command === "review") {
    return handleReviewCommand(parsed.argv.slice(1), { format: parsed.format });
  }

  if (command === "api") {
    return handleApiCommand(parsed.argv.slice(1), { format: parsed.format });
  }

  await writeOutput(
    {
      ok: false,
      error: {
        code: "UNKNOWN_COMMAND",
        message: `Unknown command: ${parsed.argv.join(" ")}`,
        retryable: false
      }
    },
    { format: parsed.format }
  );
  return 1;
}

function parseGlobalOptions(argv: string[]): { argv: string[]; format: OutputFormat } {
  const nextArgv: string[] = [];
  let format: OutputFormat = "json";

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--format") {
      const value = argv[index + 1];
      if (isOutputFormat(value)) {
        format = value;
        index += 1;
        continue;
      }
    }
    nextArgv.push(arg);
  }

  return { argv: nextArgv, format };
}

function isOutputFormat(value: string | undefined): value is OutputFormat {
  return value === "json" || value === "pretty" || value === "table" || value === "ndjson";
}

main(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code;
  })
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`canvas: ${message}\n`);
    process.exitCode = 1;
  });
