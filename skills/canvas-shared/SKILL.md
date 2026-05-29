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

Resolve the CLI command once per session:

```bash
command -v canvas
```

If this succeeds, use plain `canvas ...` commands for the rest of the session.

If this fails, use this non-global fallback prefix for the rest of the session:

```bash
npm exec --yes --package @lukeguo12210/canvas-cli -- canvas
```

Do not wrap every command in `canvas ... || npm exec ...`; it is noisy and can make agents wait on npm repeatedly. Pick one command prefix, then run the requested Canvas command once.

Check auth after the command prefix is resolved:

```bash
canvas auth status --format json
```

or:

```bash
npm exec --yes --package @lukeguo12210/canvas-cli -- canvas auth status --format json
```

For permanent install, tell the user:

```bash
npm install -g @lukeguo12210/canvas-cli
canvas skills install
```

If global install fails with `EACCES` under `/usr/local`, do not use `sudo` or create symlinks in `/usr/local`. Ask the user to configure a user-level npm prefix, use a Node version manager, or continue with the `npm exec` fallback for this session.

## Current CLI Surface

Implemented now:

- `canvas auth login`
- `canvas auth status`
- `canvas auth schools search <query>`
- `canvas auth logout`
- `canvas config show`
- `canvas me`
- `canvas courses list`
- `canvas courses search <query>`
- `canvas courses show <course-id>`
- `canvas courses overview <course-id>`
- `canvas tabs list --course-id <course-id>`
- `canvas review pack`
- `canvas api get`
- `canvas modules list/items/item/export`
- `canvas assignments list/show/export`
- `canvas pages list/show/export`
- `canvas files list/show/download/download-linked`
- `canvas folders list/path`
- `canvas skills install/command/status`

Planned but not implemented yet:

- `canvas context show`
- grades, submissions, discussions, calendar, groups, conversations

## Core Rules

- Use `canvas auth status` first if auth state is uncertain.
- If no auth config exists, use `canvas auth schools search <query>` and then `canvas auth login --school <query> --token-env <env>` or `canvas auth login --school <query> --token <token>` when the user explicitly provides a PAT.
- Never print, paste, summarize, or expose a Canvas personal access token after receiving it.
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
canvas auth schools search "Columbia" --format json
canvas skills install
canvas courses list --active --page-all --format json
canvas courses search "course name" --format json
canvas courses overview <course-id> --format json
```
