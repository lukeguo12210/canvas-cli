import { CanvasClient, normalizeBaseUrl } from "../core/canvas-client.js";
import { ConfigStore, type CanvasConfig } from "../core/config-store.js";
import { CanvasCliError, toErrorEnvelope } from "../core/errors.js";
import type { OutputFormat } from "../core/output.js";
import { writeOutput } from "../core/output.js";
import { openBrowser } from "../core/browser.js";
import { createPrompt, promptHidden, type PromptIO } from "../core/prompt.js";
import { makeCustomSchool, searchSchools, type School } from "../registry/schools.js";
import { runPostLoginBootstrap } from "../workflows/context-bootstrap.js";
import { flagValue, positionalArgs } from "./shared.js";

const TOKEN_PURPOSE = "Hyperknow";

export async function handleAuthCommand(
  argv: string[],
  options: { format: OutputFormat }
): Promise<number> {
  const [subcommand] = argv;

  if (!subcommand || subcommand === "--help" || subcommand === "-h" || subcommand === "help") {
    process.stdout.write(authHelpText());
    return 0;
  }

  if (subcommand === "login") {
    return authLogin(argv.slice(1), options);
  }

  if (subcommand === "status") {
    return authStatus(options);
  }

  if (subcommand === "schools") {
    return authSchools(argv.slice(1), options);
  }

  if (subcommand === "logout") {
    return authLogout(options);
  }

  await writeOutput(
    {
      ok: false,
      error: {
        code: "UNKNOWN_COMMAND",
        message: `Unknown auth command: ${argv.join(" ")}`,
        retryable: false
      }
    },
    options
  );
  return 1;
}

export function authHelpText(): string {
  return `canvas auth — authenticate and inspect Canvas login state.

USAGE:
  canvas auth <command> [options]

COMMANDS:
  login                    Interactive Canvas PAT setup
  login --school <query>   Non-interactive login with a school search
  login --school-url <url> Non-interactive login with a custom Canvas URL
  schools search <query>   Search supported Canvas school URLs
  status                   Show redacted auth status
  logout                   Remove local Canvas auth config

TOKEN OPTIONS:
  --token <PAT>            Use a token provided by the user
  --token-env <ENV>        Read token from an environment variable
  --token-stdin            Read token from stdin

EXAMPLES:
  canvas auth schools search "Berkeley" --format json
  canvas auth login --school "Berkeley" --token-env CANVAS_TOKEN
  canvas auth login --school-url https://bcourses.berkeley.edu --school-name "UC Berkeley" --token "paste-token-here"
`;
}

async function authLogin(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const io = createPrompt();

  try {
    const nonInteractive = hasNonInteractiveLoginArgs(argv);
    const school = nonInteractive ? resolveSchoolFromArgs(argv) : await chooseSchool(io);
    const settingsUrl = `${school.url}/profile/settings`;

    const providedToken = await tokenFromArgs(argv);
    let token = providedToken;

    if (!token) {
      process.stdout.write(tokenInstructions(school, settingsUrl));
      await io.question("Press Enter to open Canvas settings in your browser...");
      await openBrowser(settingsUrl);
      process.stdout.write("\nWaiting for your Canvas personal access token.\n");
      token = await promptHidden("Paste token: ");
    }

    if (!token) {
      throw new CanvasCliError("EMPTY_TOKEN", "No token entered.");
    }

    const client = new CanvasClient({ baseUrl: school.url, token });
    const user = await validateToken(client);
    const now = new Date().toISOString();
    const config: CanvasConfig = {
      version: 1,
      activeProfile: "default",
      profiles: {
        default: {
          schoolName: school.name,
          baseUrl: school.url,
          token,
          createdAt: now,
          validatedAt: now,
          user
        }
      }
    };

    await new ConfigStore().write(config);
    const bootstrap = await runPostLoginBootstrap();

    await writeOutput(
      {
        ok: true,
        data: {
          authenticated: true,
          school: {
            name: school.name,
            baseUrl: school.url
          },
          user,
          contextBootstrap: bootstrap,
          next: "canvas courses list --active --page-all"
        },
        meta: {
          command: "auth login"
        }
      },
      options
    );
    return 0;
  } catch (error) {
    await writeOutput(toErrorEnvelope(error), options);
    return 1;
  } finally {
    io.close();
  }
}

async function authSchools(argv: string[], options: { format: OutputFormat }): Promise<number> {
  const [subcommand] = argv;
  const query =
    subcommand === "search"
      ? positionalArgs(argv.slice(1)).join(" ")
      : flagValue(argv, "--query") ?? positionalArgs(argv).join(" ");

  await writeOutput(
    {
      ok: true,
      data: searchSchools(query).map((school) => ({
        name: school.name,
        baseUrl: school.url
      })),
      meta: {
        command: "auth schools",
        query
      }
    },
    options
  );
  return 0;
}

async function authStatus(options: { format: OutputFormat }): Promise<number> {
  const store = new ConfigStore();
  const config = await store.readRedacted();

  if (!config) {
    await writeOutput(
      {
        ok: true,
        data: {
          authenticated: false,
          message: "No Canvas auth config found. Run canvas auth login."
        },
        meta: {
          command: "auth status"
        }
      },
      options
    );
    return 0;
  }

  await writeOutput(
    {
      ok: true,
      data: {
        authenticated: true,
        activeProfile: config.activeProfile,
        profile: config.profiles[config.activeProfile]
      },
      meta: {
        command: "auth status"
      }
    },
    options
  );
  return 0;
}

async function authLogout(options: { format: OutputFormat }): Promise<number> {
  await new ConfigStore().remove();
  await writeOutput(
    {
      ok: true,
      data: {
        authenticated: false,
        message: "Canvas auth config removed."
      },
      meta: {
        command: "auth logout"
      }
    },
    options
  );
  return 0;
}

export async function chooseSchool(
  io: PromptIO,
  write: (message: string) => void = (message) => process.stdout.write(message)
): Promise<School> {
  write("Search for your school, or press Enter to browse the first matches.\n");
  const query = await io.question("School: ");
  const matches = searchSchools(query);

  if (matches.length === 1) {
    const school = matches[0];
    const answer = (
      await io.question(`Is this your school: ${school.name} (${school.url})? Choose: y/n `)
    )
      .trim()
      .toLowerCase();

    if (answer === "y" || answer === "yes") {
      return {
        name: school.name,
        url: normalizeBaseUrl(school.url)
      };
    }

    if (answer === "n" || answer === "no") {
      return promptCustomSchool(io);
    }

    throw new CanvasCliError("INVALID_SELECTION", "Please answer y or n.");
  }

  for (const [index, school] of matches.entries()) {
    write(`${index + 1}. ${school.name}\n   ${school.url}\n`);
  }
  write(`${matches.length + 1}. Not found? Add your own\n`);

  const selected = Number.parseInt(await io.question("Choose: "), 10);
  if (!Number.isFinite(selected) || selected < 1 || selected > matches.length + 1) {
    throw new CanvasCliError("INVALID_SELECTION", "Invalid school selection.");
  }

  if (selected === matches.length + 1) {
    return promptCustomSchool(io);
  }

  const school = matches[selected - 1];
  return {
    name: school.name,
    url: normalizeBaseUrl(school.url)
  };
}

export function resolveSchoolFromArgs(argv: string[]): School {
  const schoolUrl = flagValue(argv, "--school-url") ?? flagValue(argv, "--url");
  if (schoolUrl) {
    return makeCustomSchool(flagValue(argv, "--school-name") ?? flagValue(argv, "--name") ?? "Custom Canvas School", schoolUrl);
  }

  const schoolQuery = flagValue(argv, "--school") ?? flagValue(argv, "--school-query");
  if (!schoolQuery) {
    throw new CanvasCliError(
      "MISSING_SCHOOL",
      "Non-interactive auth requires --school <query> or --school-url <url>."
    );
  }

  const matches = searchSchools(schoolQuery, 20);
  if (matches.length === 0) {
    throw new CanvasCliError(
      "SCHOOL_NOT_FOUND",
      `No Canvas school matched "${schoolQuery}". Use --school-url <url> for a custom Canvas URL.`
    );
  }

  const exact = matches.find((school) => {
    return school.name.toLowerCase() === schoolQuery.toLowerCase() || school.url.toLowerCase() === schoolQuery.toLowerCase();
  });

  if (exact) {
    return {
      name: exact.name,
      url: normalizeBaseUrl(exact.url)
    };
  }

  if (matches.length === 1) {
    const school = matches[0];
    return {
      name: school.name,
      url: normalizeBaseUrl(school.url)
    };
  }

  throw new CanvasCliError(
    "AMBIGUOUS_SCHOOL",
    `Multiple schools matched "${schoolQuery}": ${matches
      .map((school) => `${school.name} (${school.url})`)
      .join("; ")}. Use a more specific --school value or --school-url.`
  );
}

export async function tokenFromArgs(argv: string[]): Promise<string | undefined> {
  const directToken = flagValue(argv, "--token");
  if (directToken) {
    return directToken.trim();
  }

  const envName = flagValue(argv, "--token-env");
  if (envName) {
    return process.env[envName]?.trim();
  }

  if (argv.includes("--token-stdin")) {
    return readStdin().then((value) => value.trim());
  }

  return undefined;
}

async function promptCustomSchool(io: PromptIO): Promise<School> {
  const name = await io.question("School display name: ");
  const url = await io.question("Canvas base URL: ");
  return makeCustomSchool(name, url);
}

function hasNonInteractiveLoginArgs(argv: string[]): boolean {
  return Boolean(
    flagValue(argv, "--school") ||
      flagValue(argv, "--school-query") ||
      flagValue(argv, "--school-url") ||
      flagValue(argv, "--url")
  );
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function tokenInstructions(school: School, settingsUrl: string): string {
  return `
Canvas token setup for ${school.name}

1. Go to ${settingsUrl}
2. Click "+ New Access Token"
3. Enter "${TOKEN_PURPOSE}" as the purpose
4. Optionally set an expiration date
5. Click "Generate Token"
6. Copy the token and paste it back here

`;
}

async function validateToken(client: CanvasClient): Promise<{ id?: string; name?: string }> {
  try {
    const response = await client.get<{ id?: string; name?: string; short_name?: string }>(
      "/api/v1/users/self/profile"
    );
    return {
      id: response.data.id,
      name: response.data.name ?? response.data.short_name
    };
  } catch (error) {
    if (error instanceof CanvasCliError && error.status === 404) {
      await client.get("/api/v1/courses");
      return {};
    }
    throw error;
  }
}
