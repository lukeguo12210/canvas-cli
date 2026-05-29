# Canvas Auth Reference

Implemented auth commands:

```bash
canvas auth login
canvas auth login --school "Columbia" --token-env CANVAS_TOKEN
canvas auth login --school-url https://courseworks2.columbia.edu --school-name "Columbia University (CourseWorks)" --token "paste-token-here"
canvas auth schools search "Columbia" --format json
canvas auth status --format json
canvas auth logout
canvas config show --format json
canvas me --format json
```

Resolve the CLI command once per session:

```bash
command -v canvas
```

If `canvas` is not on `PATH`, use the npm exec fallback prefix for the rest of the session:

```bash
npm exec --yes --package @lukeguo12210/canvas-cli -- canvas auth status --format json
npm exec --yes --package @lukeguo12210/canvas-cli -- canvas auth login
npm exec --yes --package @lukeguo12210/canvas-cli -- canvas auth login --school "Columbia" --token-env CANVAS_TOKEN
```

Do not run repeated compound commands like `canvas ... || npm exec ...`. Pick either `canvas` or the npm exec prefix and use it consistently.

Do not attempt `sudo npm install -g` from inside an agent session. Prefer the fallback above or ask the user to fix their npm global prefix.

## Agent Login Flow

Agents can complete login non-interactively when the user explicitly provides a Canvas PAT.

1. Search schools:

```bash
canvas auth schools search "Columbia" --format json
```

2. Login with a known school match:

```bash
canvas auth login --school "Columbia" --token-env CANVAS_TOKEN
```

or, if the user provides the token directly in chat:

```bash
canvas auth login --school "Columbia" --token "paste-token-here"
```

3. For a custom Canvas URL:

```bash
canvas auth login --school-url https://courseworks2.columbia.edu --school-name "Columbia University (CourseWorks)" --token-env CANVAS_TOKEN
```

4. Verify:

```bash
canvas auth status --format json
canvas courses list --active --page-all --format json
```

If `--school` matches multiple schools, run `canvas auth schools search <query>` and retry with a more specific value or use `--school-url`.

## Interactive Login Flow

`canvas auth login` is interactive.

Expected flow:

1. User searches for a school.
2. If exactly one school matches, confirm:

```text
Is this your school: Columbia University (CourseWorks) (https://courseworks2.columbia.edu)? Choose: y/n
```

3. If user chooses `y`, continue with that school.
4. If user chooses `n`, ask for custom school name and Canvas base URL.
5. Print Canvas PAT creation instructions.
6. Open `<baseUrl>/profile/settings` in the browser.
7. Prompt for PAT using hidden input.
8. Validate token.
9. Store local config.

## Token Handling

The CLI supports agent-provided PATs for initial setup:

- `--token <PAT>`: direct token argument.
- `--token-env <ENV_NAME>`: read token from an environment variable.
- `--token-stdin`: read token from stdin.

Prefer `--token-env` or `--token-stdin` when possible. If the user pastes a PAT into chat, use it only for `canvas auth login`, then do not repeat, print, summarize, or store it anywhere except the Canvas config written by the CLI.

Never print:

- PAT values
- `Authorization` headers
- bearer tokens
- query params named `token`, `access_token`, `api_key`, `verifier`, or `code`

## Auth Status

Use:

```bash
canvas auth status --format json
```

If `authenticated` is `false`, ask the user to run:

```bash
canvas auth login
```

## Current User

Use:

```bash
canvas me --format json
```

This calls Canvas `GET /api/v1/users/self/profile`.
