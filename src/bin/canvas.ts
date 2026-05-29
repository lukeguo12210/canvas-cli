import { writeOutput } from "../core/output.js";

const VERSION = "0.0.0";

function helpText(): string {
  return `canvas — Canvas LMS CLI for students and agents.

USAGE:
  canvas <command> [options]

COMMANDS:
  auth login        Interactive Canvas PAT setup
  auth status       Show redacted auth status
  context show      Show cached post-login context
  courses list      List active Canvas courses
  review pack       Create a local course review pack
  version           Print CLI version

FLAGS:
  -h, --help        Show help
  --format <fmt>    Output format: json | pretty | table | ndjson

MVP STATUS:
  This scaffold currently implements root help and version only.
`;
}

async function main(argv: string[]): Promise<number> {
  const [command, subcommand] = argv;

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
      { format: "pretty" }
    );
    return 0;
  }

  if (command === "auth" && subcommand === "login") {
    await writeOutput(
      {
        ok: false,
        error: {
          code: "NOT_IMPLEMENTED",
          message: "canvas auth login is planned for Phase 2.",
          retryable: false
        }
      },
      { format: "pretty" }
    );
    return 1;
  }

  await writeOutput(
    {
      ok: false,
      error: {
        code: "UNKNOWN_COMMAND",
        message: `Unknown command: ${argv.join(" ")}`,
        retryable: false
      }
    },
    { format: "pretty" }
  );
  return 1;
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
