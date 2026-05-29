import { writeOutput } from "../core/output.js";
import type { OutputFormat } from "../core/output.js";
import { handleAuthCommand } from "../commands/auth.js";
import { handleConfigCommand } from "../commands/config.js";
import { handleMeCommand } from "../commands/me.js";

const VERSION = "0.0.0";

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
  context show      Show cached post-login context
  courses list      List active Canvas courses
  review pack       Create a local course review pack
  version           Print CLI version

FLAGS:
  -h, --help        Show help
  --format <fmt>    Output format: json | pretty | table | ndjson

MVP STATUS:
  Auth/config/me are in progress. Course and review commands are planned next.
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
