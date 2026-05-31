# @lukeguo12210/canvas-cli

[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-yellow.svg)](LICENSE)

Connect Canvas courses to AI agents.

`@lukeguo12210/canvas-cli` turns Canvas LMS into an agent-readable course workspace. Today, students dig through Canvas, download slides, find assignments, copy pages, and upload everything back into LLMs. Canvas CLI makes that one workflow: pull course materials, modules, files, assignments, pages, folders, and review packs into a structure AI agents can immediately understand.

[Install](#installation--quick-start) · [Agent Skills](#agent-skills) · [Auth](#authentication) · [Commands](#command-system) · [Security](#security--privacy) · [License](#license) · [Roadmap](#roadmap)

## Why @lukeguo12210/canvas-cli?

- **Built for technical students** — bring Canvas into your terminal, scripts, and AI workflow.
- **Agent-native design** — structured skills teach agents Canvas auth, pagination, course structure, and study workflows.
- **No more manual Canvas digging** — pull slides, files, pages, assignments, folders, and module structure without download/upload loops.
- **Review-pack first** — export course structure into an agent-readable folder for study sessions.
- **Canvas-native commands** — simple commands such as `canvas courses list`, `canvas modules list`, and `canvas review pack`.
- **Student-facing scope** — starts with the read-only course surface students need for review, planning, and coursework navigation.

## Features

| Category | Capabilities |
| --- | --- |
| Auth | Interactive `canvas auth login`, school picker, Canvas settings walkthrough, local PAT config |
| Courses | List, search, inspect, and summarize active courses |
| Tabs | Inspect visible Canvas course tabs and external tool links |
| Modules | Traverse modules and module items in Canvas order |
| Pages | List pages, inspect Canvas HTML, and export visible pages |
| Files | List files/folders and download accessible course files safely |
| Folders | Browse Canvas folder trees and folder paths |
| Assignments | List assignments, due dates, descriptions, visible attachments, and exports |
| Raw API | Run read-only `GET` requests against Canvas API paths |
| Review Packs | Preserve Canvas course structure in an agent-readable export |
| Agent Skills | Skills that teach agents exact commands, output shapes, and Canvas workflows |

## Status

Student read-only MVP in progress.

Implemented:

- `canvas auth login/status/logout`, `canvas config show`, and `canvas me`.
- Courses, tabs, modules, assignments, pages, files, folders, raw GET, and review-pack foundation commands.
- Local JSON/HTML/Markdown exports for modules, assignments, pages, and review packs.
- Safe file download to a requested output directory.
- Core runtime utilities for output envelopes, redaction, config paths, pagination, and Canvas GET/download requests.
- Unit tests for command normalization, routing helpers, and safety-critical runtime.
- Engineering PRD and executable build plan.
- Agent skill bundle for the implemented command surface.

Planned next:

- Post-login context bootstrap.
- Broader review-pack indexing, citations, and linked-file resolution.
- Grades, submissions, discussions, announcements, calendar, groups, conversations, and richer review indexing.

## Installation & Quick Start

### Requirements

- Node.js 20+
- npm
- A Canvas personal access token generated from your own Canvas account

### Install

```bash
npm install -g @lukeguo12210/canvas-cli
```

### Use

```bash
# 1. Authenticate with your Canvas school
canvas auth login

# Agent/non-interactive auth
canvas auth schools search "Columbia"
canvas auth login --school "Columbia"
canvas auth login --school "Columbia" --token-env CANVAS_TOKEN

# 2. List courses
canvas courses list

# 3. Inspect a course
canvas courses overview <course-id>

# 4. Build a local review pack foundation
canvas review pack --course-id <course-id> --out ./review/<course>
```

### Install Agent Skills

```bash
canvas skills install
```

Equivalent direct installer command:

```bash
npx skills add lukeguo12210/canvas-cli -g --skill "*" -y
```

## Agent Skills

| Skill | Description |
| --- | --- |
| `canvas-shared` | Auth, token safety, output formats, pagination, raw API usage, common Canvas errors |
| `canvas-courses` | Course discovery, course name disambiguation, tabs, and overview |
| `canvas-modules` | Module traversal, module item resolution, Canvas course order |
| `canvas-pages` | Page listing, page HTML inspection, local page export |
| `canvas-files` | File metadata, folders, linked files, safe downloads |
| `canvas-assignments` | Assignments, due dates, descriptions, visible attachments |
| `canvas-review` | Review-pack workflow that preserves Canvas course structure |

Skills live in [`skills/`](skills/). Each domain skill points agents back to `canvas-shared` first, then gives quick decisions, command examples, Canvas concepts, common errors, and output expectations.

## Authentication

The MVP uses personal access tokens only.

```bash
canvas auth login
```

The login flow will:

1. Ask for your school.
2. Open your Canvas settings page.
3. Guide you through creating a personal access token.
4. Store the token locally.
5. Run a lightweight context bootstrap.

Agents can complete setup with a token the user provides:

```bash
canvas auth login --school "Berkeley" --token "paste-token-here"
```

## Command System

`@lukeguo12210/canvas-cli` uses a simple Canvas-native command system.

### Student Workflows

```bash
canvas review pack --course-id <course-id> --out ./review/<course>
canvas review pack --course-id <course-id> --out ./review/<course> --include-all-files
```

### Full Command Surface

```bash
canvas auth login
canvas auth login --school "Berkeley"
canvas auth login --school "Columbia" --token-env CANVAS_TOKEN
canvas auth login --school-url https://courseworks2.columbia.edu --school-name "Columbia University (CourseWorks)" --token "paste-token-here"
canvas auth schools search "Columbia"
canvas auth status
canvas auth logout
canvas config show
canvas me

canvas courses list
canvas courses search "algorithms"
canvas courses show <course-id>
canvas courses overview <course-id>
canvas tabs list --course-id <course-id>

canvas modules list --course-id <course-id>
canvas modules items --course-id <course-id> --module-id <module-id>
canvas modules item --course-id <course-id> --module-id <module-id> --item-id <item-id>
canvas modules export --course-id <course-id> --module-id <module-id> --out ./module

canvas assignments list --course-id <course-id>
canvas assignments show --course-id <course-id> --assignment-id <assignment-id>
canvas assignments export --course-id <course-id> --assignment-id <assignment-id> --out ./assignment

canvas pages list --course-id <course-id>
canvas pages show --course-id <course-id> --page <url-or-id>
canvas pages export --course-id <course-id> --page <url-or-id> --out ./page

canvas files list --course-id <course-id>
canvas files show <file-id>
canvas files download <file-id> --out ./files
canvas files download-linked --course-id <course-id> --out ./files

canvas folders list --course-id <course-id>
canvas folders path --course-id <course-id> --path "course files/week 1"

canvas review pack --course-id <course-id> --out ./review/<course>
canvas review pack --course-id <course-id> --out ./review/<course> --include-all-files

canvas api get /api/v1/courses
canvas api get /api/v1/courses/<course-id>/modules --params '{"include":["items"]}'

canvas skills install
canvas install-skills
canvas skills command
canvas skills status
```

MVP raw API access is GET-only.

## Output Formats

```bash
--format json      # default, agent-friendly
--format pretty    # human-readable
--format table     # simple list output
--format ndjson    # streaming/batch-friendly
```

## Security & Privacy

- Tokens are stored in the local Canvas CLI config after auth.
- Logs and errors redact `Authorization`, `access_token`, `token`, and bearer values.
- The MVP refuses Canvas write methods.
- Review packs exclude grades, submissions, conversations, and group member lists by default.
- Downloads are constrained to the requested output directory.
- Pagination follows Canvas `Link` headers instead of guessing URLs.

## License

`@lukeguo12210/canvas-cli` is source-available under the Business Source License 1.1.

Personal, educational, research, academic, non-commercial, and internal evaluation use is permitted. Commercial hosted services, managed services, paid integrations, or competing product offerings require a separate commercial license until the Change Date.

Change Date: May 29, 2030.

Change License: GNU Affero General Public License v3.0 or later.

See [LICENSE](LICENSE).

## Roadmap

Near term:

- Implement `canvas auth login`.
- Add school registry and custom Canvas URL setup.
- Add post-login context bootstrap.
- Implement courses, tabs, modules, assignments, pages, and files.
- Expand `canvas review pack` with citations, indexing, and richer file resolution.
- Package skills for `npx skills add lukeguo12210/canvas-cli -g --skill "*" -y`.

Later:

- Full student read surface: grades, submissions, quizzes, discussions, announcements, planner, groups, conversations.
- Optional write-capable student workflows with explicit commands and dedicated skills.
- Public npm release.

## Development

```bash
npm install
npm run typecheck
npm run test
npm run build
```

## Docs

- [Engineering PRD](docs/engineering-prd.md)
- [Executable Build Steps](docs/build-steps.md)
- [Read-Only-First Plan](docs/read-only-first.md)

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=lukeguo12210/canvas-cli&type=Date)](https://www.star-history.com/#lukeguo12210/canvas-cli&Date)
