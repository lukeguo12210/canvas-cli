# canvas-cli

Agent-native Canvas LMS CLI and skills bundle for students.

The package/project is `canvas-cli`. The installed command is `canvas`.

`canvas-cli` follows the same bundle idea as `larksuite/cli`: a CLI that humans can run directly, plus structured agent skills that teach Codex, Claude Code, and other local agents how to authenticate, understand Canvas resource semantics, and pull course context systematically.

## Status

Early scaffold.

Implemented:

- TypeScript/Node package scaffold.
- `canvas --help` and `canvas version`.
- Core runtime utilities for output envelopes, redaction, config paths, pagination, and Canvas GET requests.
- Initial unit tests for the safety-critical runtime.
- Engineering PRD and executable build plan.
- Initial Lark-style skill bundle skeleton.

Not implemented yet:

- `canvas auth login`.
- Canvas school picker and PAT setup flow.
- Post-login context bootstrap.
- Course/resource commands.
- Review packs.

## Product Stance

The MVP is student-only and read-only.

For now, `canvas-cli` relies only on the student's own Canvas personal access token for local/self use. OAuth can be revisited later if the project needs school-approved multi-user distribution.

MVP behavior:

- `canvas auth login` will guide the user through school selection and PAT setup.
- The CLI will pull student-facing Canvas data.
- The flagship workflow will be `canvas review pack`.
- Review packs will preserve Canvas course structure with course as the top-level unit.
- Sensitive read-only data such as grades, submissions, conversations, and group members will require explicit commands or flags.
- Canvas write workflows are future work and should have dedicated commands and skills.

## Planned Quick Start

```bash
npm install -g canvas-cli
canvas auth login
canvas context show
canvas courses list
canvas review pack --course-id <course-id> --out ./review/<course>
npx skills add canvas-cli -g -y
```

## Command Shape

The CLI uses simple Canvas-native commands:

```bash
canvas courses list
canvas modules list --course-id <course-id>
canvas assignments list --course-id <course-id>
canvas files download <file-id> --out ./files
canvas review pack --course-id <course-id> --out ./review/<course>
canvas api get /api/v1/courses
```

## Agent Skills

Initial skills live in [`skills/`](skills/):

- `canvas-shared`
- `canvas-courses`
- `canvas-modules`
- `canvas-files`
- `canvas-assignments`
- `canvas-review`

The skills are modeled after Lark's high-signal design: shared auth and safety rules first, then narrow domain skills with quick decisions, command examples, Canvas resource concepts, common errors, and output expectations.

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
