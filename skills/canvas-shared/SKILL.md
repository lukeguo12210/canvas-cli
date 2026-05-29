---
name: canvas-shared
version: 0.1.0
description: "Canvas LMS shared rules: PAT auth, school URL setup, token safety, pagination, output formats, raw read-only API usage, and common Canvas error handling."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas --help"
---

# canvas-shared

Read this skill before using any other Canvas skill.

## CLI Availability

First try:

```bash
canvas auth status --format json
```

If the shell returns `command not found: canvas`, the CLI is not on `PATH`.

Use this non-global fallback inside an agent session:

```bash
npm exec --yes --package @lukeguo12210/canvas-cli -- canvas auth status --format json
```

When using the fallback, replace the leading `canvas` in any command with:

```bash
npm exec --yes --package @lukeguo12210/canvas-cli -- canvas
```

For permanent install, tell the user:

```bash
npm install -g @lukeguo12210/canvas-cli
```

If global install fails with `EACCES` under `/usr/local`, do not use `sudo` or create symlinks in `/usr/local`. Ask the user to configure a user-level npm prefix, use a Node version manager, or continue with the `npm exec` fallback for this session.

## Current CLI Surface

Implemented now:

- `canvas auth login`
- `canvas auth status`
- `canvas auth logout`
- `canvas config show`
- `canvas me`
- `canvas courses list`
- `canvas courses search <query>`
- `canvas courses show <course-id>`
- `canvas courses overview <course-id>`
- `canvas tabs list --course-id <course-id>`

Planned but not implemented yet:

- `canvas context show`
- `canvas review pack`
- `canvas api get`
- modules, pages, files, assignments, grades, submissions, discussions, calendar, groups, conversations

## Core Rules

- Use `canvas auth status` first if auth state is uncertain.
- If no auth config exists, ask the user to run `canvas auth login`.
- Never print, paste, summarize, or expose a Canvas personal access token.
- Default output is JSON and should be preferred for agents.
- Use `--format pretty` only when presenting a compact human-facing result.
- Use `--page-all` when completeness matters.
- Canvas pagination follows `Link` headers; do not synthesize next-page URLs.
- MVP cannot write to Canvas.
- Do not pretend planned commands exist. If a command is marked planned, say it is not implemented yet.

## References

- [Auth flow](references/auth.md)
- [Output format](references/output.md)
- [Pagination](references/pagination.md)

## Privacy

Sensitive read-only data must be requested explicitly:

- grades
- submissions
- conversations
- group member lists

Do not include those in review packs unless the user explicitly asks.

## Common Errors

- `NO_AUTH_CONFIG`: no local auth config; ask the user to run `canvas auth login`.
- `CANVAS_NETWORK_ERROR`: Canvas could not be reached; retry later or check network/sandbox access.
- `CANVAS_UNAUTHORIZED` / `401`: invalid or expired PAT; ask the user to run `canvas auth login`.
- `CANVAS_FORBIDDEN` / `403`: locked, unpublished, or permission-denied content.
- `CANVAS_NOT_FOUND` / `404`: content unavailable or not visible to this user.
- `CANVAS_RATE_LIMITED` / `429`: rate limited; retry later or use lower pagination concurrency.
- `CANVAS_SERVER_ERROR` / `5xx`: Canvas backend issue.

## Good First Commands

```bash
canvas auth status --format json
canvas courses list --active --page-all --format json
canvas courses search "course name" --format json
```
