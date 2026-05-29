import { ConfigStore } from "../core/config-store.js";
import type { OutputFormat } from "../core/output.js";
import { writeOutput } from "../core/output.js";

export async function handleConfigCommand(
  argv: string[],
  options: { format: OutputFormat }
): Promise<number> {
  const [subcommand] = argv;

  if (subcommand !== "show") {
    await writeOutput(
      {
        ok: false,
        error: {
          code: "UNKNOWN_COMMAND",
          message: `Unknown config command: ${argv.join(" ")}`,
          retryable: false
        }
      },
      options
    );
    return 1;
  }

  const config = await new ConfigStore().readRedacted();
  await writeOutput(
    {
      ok: true,
      data: config ?? {
        configured: false,
        message: "No Canvas config found. Run canvas auth login."
      },
      meta: {
        command: "config show"
      }
    },
    options
  );
  return 0;
}
