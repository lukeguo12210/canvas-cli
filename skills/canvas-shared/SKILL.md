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

## Core Rules

- Use `canvas auth login` for interactive PAT setup.
- Never print, paste, summarize, or expose a Canvas personal access token.
- Use `canvas auth status` if auth state is uncertain.
- `canvas auth login` automatically runs post-login context bootstrap once implemented.
- Use `canvas context show` to inspect cached user, school, course, and semester context.
- Default output is JSON and should be preferred for agents.
- Use `--format pretty` only when presenting a compact human-facing result.
- Use `--page-all` when completeness matters.
- Canvas pagination follows `Link` headers; do not synthesize next-page URLs.
- Raw API escape hatch is `canvas api get <path>`.
- MVP cannot write to Canvas.

## Privacy

Sensitive read-only data must be requested explicitly:

- grades
- submissions
- conversations
- group member lists

Do not include those in review packs unless the user explicitly asks.

## Common Errors

- `401`: invalid or expired PAT; ask the user to run `canvas auth login`.
- `403`: locked, unpublished, or permission-denied content.
- `404`: content unavailable or not visible to this user.
- `429`: rate limited; retry later or use lower pagination concurrency.
- `503`: Canvas discussion cache or backend temporarily unavailable.
