import { CanvasClient, normalizeBaseUrl } from "../core/canvas-client.js";
import { ConfigStore, type CanvasConfig } from "../core/config-store.js";
import { CanvasCliError, toErrorEnvelope } from "../core/errors.js";
import type { OutputFormat } from "../core/output.js";
import { writeOutput } from "../core/output.js";
import { openBrowser } from "../core/browser.js";
import { createPrompt, promptHidden, type PromptIO } from "../core/prompt.js";
import { makeCustomSchool, searchSchools, type School } from "../registry/schools.js";
import { runPostLoginBootstrap } from "../workflows/context-bootstrap.js";

const TOKEN_PURPOSE = "Hyperknow";

export async function handleAuthCommand(
  argv: string[],
  options: { format: OutputFormat }
): Promise<number> {
  const [subcommand] = argv;

  if (subcommand === "login") {
    return authLogin(options);
  }

  if (subcommand === "status") {
    return authStatus(options);
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

async function authLogin(options: { format: OutputFormat }): Promise<number> {
  const io = createPrompt();

  try {
    const school = await chooseSchool(io);
    const settingsUrl = `${school.url}/profile/settings`;

    process.stdout.write(tokenInstructions(school, settingsUrl));
    await io.question("Press Enter to open Canvas settings in your browser...");
    await openBrowser(settingsUrl);
    process.stdout.write("\nWaiting for your Canvas personal access token.\n");

    const token = await promptHidden("Paste token: ");
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
          next: "canvas context show"
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

async function promptCustomSchool(io: PromptIO): Promise<School> {
  const name = await io.question("School display name: ");
  const url = await io.question("Canvas base URL: ");
  return makeCustomSchool(name, url);
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
