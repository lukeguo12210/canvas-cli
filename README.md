# canvas-cli

[![License: BUSL-1.1](https://img.shields.io/badge/License-BUSL--1.1-yellow.svg)](LICENSE)

Canvas CLI for technical students and AI agents.

`canvas-cli` turns Canvas LMS into a local, scriptable, agent-readable workspace. It is built for students who already live in terminals, editors, notebooks, and AI coding tools. Use the `canvas` command directly, or install the bundled skills so Codex, Claude Code, and other local agents can authenticate, understand your courses, pull materials, inspect upcoming work, and build review packs.

[Install](#installation--quick-start) · [Agent Skills](#agent-skills) · [Auth](#authentication) · [Commands](#command-system) · [Security](#security--privacy) · [License](#license) · [Roadmap](#roadmap)

## Why canvas-cli?

- **Built for technical students** — bring Canvas into your terminal, scripts, and local AI workflow.
- **Agent-native design** — structured skills teach agents Canvas auth, pagination, course structure, and study workflows.
- **Course context in minutes** — after login, the CLI gathers who you are, what courses you are taking, and where you are in the semester.
- **Review-pack first** — export modules, pages, assignments, files, discussions, announcements, and calendar context into a structured local course folder.
- **Canvas-native commands** — simple commands such as `canvas courses list`, `canvas modules list`, and `canvas review pack`.
- **Local-first control** — personal access tokens stay local, and course exports are written to directories you choose.

## Features

| Category | Capabilities |
| --- | --- |
| Auth | Interactive `canvas auth login`, school picker, Canvas settings walkthrough, local PAT config |
| Context | Post-login context bootstrap: user profile, active courses, planner, calendar, upcoming assignments, modules |
| Courses | List, search, inspect, and summarize active courses |
| Modules | Traverse modules and module items in Canvas order |
| Pages | Fetch pages and export Canvas HTML to Markdown |
| Files | List files/folders and download accessible course files safely |
| Assignments | List assignments, due dates, descriptions, visible attachments, and assignment groups |
| Calendar | Pull calendar, planner, and todo context for the semester |
| Discussions | Inspect discussion prompts and announcements where visible |
| Review Packs | Preserve Canvas course structure in an agent-readable local export |
| Agent Skills | Lark-style skills for Codex, Claude Code, and other local agents |

## Status

Early scaffold.

Implemented:

- TypeScript/Node package scaffold.
- `canvas --help` and `canvas version`.
- Core runtime utilities for output envelopes, redaction, config paths, pagination, and Canvas GET requests.
- Initial unit tests for the safety-critical runtime.
- Engineering PRD and executable build plan.
- Initial Lark-style skill bundle skeleton.

Planned next:

- `canvas auth login`.
- Canvas school picker and PAT setup flow.
- Post-login context bootstrap.
- Course/resource commands.
- Review packs.

## Installation & Quick Start

### Requirements

- Node.js 20+
- npm
- A Canvas personal access token generated from your own Canvas account

### Install

```bash
npm install -g canvas-cli
```

### Use

```bash
# 1. Authenticate with your Canvas school
canvas auth login

# 2. Inspect the automatically gathered student context
canvas context show

# 3. List courses
canvas courses list

# 4. Build a local review pack
canvas review pack --course-id <course-id> --out ./review/<course>
```

### Install Agent Skills

```bash
npx skills add canvas-cli -g -y
```

## Agent Skills

| Skill | Description |
| --- | --- |
| `canvas-shared` | Auth, token safety, output formats, pagination, raw API usage, common Canvas errors |
| `canvas-courses` | Course discovery, course name disambiguation, tabs, and overview |
| `canvas-modules` | Module traversal, module item resolution, Canvas course order |
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

Personal access tokens are for local/self use. Do not paste tokens into hosted apps or share them with other users.

## Command System

`canvas-cli` uses a simple Canvas-native command system.

### Student Workflows

```bash
canvas context show
canvas review pack --course-id <course-id> --out ./review/<course>
canvas review search --path ./review/<course> --query "dynamic programming"
```

### Domain Commands

```bash
canvas courses list
canvas courses search "algorithms"
canvas modules list --course-id <course-id>
canvas assignments list --course-id <course-id>
canvas pages show --course-id <course-id> --page <url-or-id>
canvas files download <file-id> --out ./files
```

### Raw Read-Only API

```bash
canvas api get /api/v1/courses
canvas api get /api/v1/courses/<course-id>/modules --params '{"include":["items"]}'
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

- Tokens are local and must never be printed.
- Logs and errors redact `Authorization`, `access_token`, `token`, and bearer values.
- The MVP refuses Canvas write methods.
- Review packs exclude grades, submissions, conversations, and group member lists by default.
- Downloads are constrained to the requested output directory.
- Pagination follows Canvas `Link` headers instead of guessing URLs.

## License

`canvas-cli` is source-available under the Business Source License 1.1.

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
- Build `canvas review pack`.
- Package skills for `npx skills add canvas-cli -g -y`.

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

The current environment blocked dependency installation during scaffold creation, so no lockfile has been generated yet.

## Docs

- [Engineering PRD](docs/engineering-prd.md)
- [Executable Build Steps](docs/build-steps.md)
- [Read-Only-First Plan](docs/read-only-first.md)
