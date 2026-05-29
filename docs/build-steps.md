# Executable Build Steps

This document converts the engineering PRD into ordered implementation phases. Each phase should leave the repo in a runnable, testable state.

## Skill Coupling Rule

Skills are not a final polish phase. Every phase that adds or changes CLI behavior must update the corresponding skill in the same phase.

Done criteria for every feature phase:

- CLI command works.
- Tests cover the command's important behavior.
- The related `skills/<skill-name>/SKILL.md` describes when to use it.
- The skill includes copy-pastable commands matching the implementation.
- The skill points back to `../canvas-shared/SKILL.md` when it depends on auth, pagination, output formats, or safety rules.

## Phase 0: Project Scaffold

Goal: create a TypeScript/Node CLI package that installs a `canvas` command locally.

Build steps:

1. Create `package.json`.
2. Add TypeScript, tsup, vitest, eslint/prettier or biome.
3. Add `tsconfig.json`.
4. Add `tsup.config.ts`.
5. Create `src/bin/canvas.ts`.
6. Wire package bin:

```json
{
  "bin": {
    "canvas": "dist/bin/canvas.js"
  }
}
```

7. Add scripts:

```json
{
  "scripts": {
    "dev": "tsx src/bin/canvas.ts",
    "build": "tsup",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit"
  }
}
```

8. Implement root help:

```bash
canvas --help
canvas version
```

9. Create initial skill directories and frontmatter:

```text
skills/canvas-shared/SKILL.md
skills/canvas-courses/SKILL.md
skills/canvas-modules/SKILL.md
skills/canvas-files/SKILL.md
skills/canvas-assignments/SKILL.md
skills/canvas-review/SKILL.md
```

10. Ensure `package.json` includes `skills` in published files.

Done when:

- `npm install` works.
- `npm run dev -- --help` prints help.
- `npm run build` emits `dist/bin/canvas.js`.
- `node dist/bin/canvas.js --help` works.
- Skill skeletons are included in the package.

## Phase 1: Core Runtime

Goal: build reusable runtime primitives before Canvas-specific commands.

Files:

```text
src/core/errors.ts
src/core/output.ts
src/core/redaction.ts
src/core/paths.ts
src/core/config-store.ts
src/core/pagination.ts
src/core/canvas-client.ts
src/schemas/commands.ts
src/schemas/canvas.ts
skills/canvas-shared/SKILL.md
skills/canvas-shared/references/pagination.md
skills/canvas-shared/references/output.md
```

Build steps:

1. Implement stable output envelope:

```ts
type Success<T> = {
  ok: true;
  data: T;
  meta: Record<string, unknown>;
};

type Failure = {
  ok: false;
  error: {
    code: string;
    message: string;
    status?: number;
    retryable: boolean;
  };
};
```

2. Implement `--format json|pretty|table|ndjson`.
3. Implement redaction for:

- `Authorization`
- `access_token`
- `token`
- bearer tokens
- Canvas URLs containing secrets

4. Implement config paths:

```text
~/.canvas/config.json
~/.canvas/context.json
```

5. Implement config file creation with restrictive permissions where supported.
6. Implement Canvas client:

- Base URL normalization.
- `Authorization: Bearer <PAT>`.
- `Accept: application/json+canvas-string-ids`.
- JSON parsing.
- Canvas error mapping.

7. Implement pagination parser for Canvas `Link` headers.
8. Add `--page-all`, `--page-limit`, `--page-size`, `--page-delay`.
9. Update `canvas-shared` with:

- output envelope contract
- output formats
- token redaction rules
- pagination behavior
- raw request safety expectations

10. Add `references/pagination.md` and `references/output.md` with exact examples.

Tests:

```text
src/core/redaction.test.ts
src/core/paths.test.ts
src/core/config-store.test.ts
src/core/pagination.test.ts
src/core/output.test.ts
src/core/canvas-client.test.ts
```

Done when:

- Unit tests pass.
- Mocked paginated Canvas responses fetch correctly.
- Error output never leaks token-like values.
- `canvas-shared` explains output and pagination accurately.

## Phase 2: School Registry and Auth Login

Goal: implement `canvas auth login`, `canvas auth status`, and local PAT config.

Files:

```text
src/registry/schools.ts
src/commands/auth.ts
src/commands/config.ts
src/commands/me.ts
skills/canvas-shared/SKILL.md
skills/canvas-shared/references/auth.md
```

Build steps:

1. Add bundled school registry from PRD.
2. Implement searchable school picker.
3. Add `Not found? Add your own`.
4. Normalize custom URLs:

- Require `https://`.
- Remove trailing slash.
- Reject URLs containing `/api/`.

5. Print PAT setup instructions.
6. Prompt user to press Enter.
7. Open `<baseUrl>/profile/settings` in browser.
8. Prompt for PAT with hidden input.
9. Validate PAT with:

```bash
GET /api/v1/users/self/profile
```

Fallback:

```bash
GET /api/v1/courses
```

10. Store redacted local config.
11. Implement:

```bash
canvas auth status
canvas auth logout
canvas config show
canvas me
```

12. After login succeeds, call a no-op internal bootstrap hook. Phase 4 will replace the hook with the real context bootstrap. Do not print placeholder text to users.
13. Update `canvas-shared` with:

- `canvas auth login`
- school picker behavior
- PAT safety
- `canvas auth status`
- `canvas auth logout`
- `canvas config show`
- `canvas me`

14. Add `references/auth.md` with the exact login flow and expected prompts.

Tests:

- School search.
- Custom URL validation.
- Auth success with mocked Canvas.
- Auth 401 error.
- Config redaction.
- Logout removes token.

Done when:

- `canvas auth login` works end to end against a mocked server.
- `canvas auth status` never prints token.
- `canvas me` returns current profile JSON.
- `canvas-shared` documents the implemented auth/config/me commands.

## Phase 3: Read-Only Canvas Commands

Goal: implement the student-facing read-only command surface.

Shared command requirements:

- JSON output by default.
- `--format pretty` for readable summaries.
- `--page-all` for list commands.
- Never mutate Canvas.

### 3.1 Courses and Tabs

Files:

```text
src/commands/courses.ts
src/commands/tabs.ts
skills/canvas-courses/SKILL.md
```

Commands:

```bash
canvas courses list
canvas courses search <query>
canvas courses show <course-id>
canvas courses overview <course-id>
canvas tabs list --course-id <course-id>
```

Skill work:

- Update `canvas-courses` with course discovery, search, show, overview, and tabs commands.
- Document course ID preference after a course is resolved.
- Document `canvas context show` as the first source of course context once Phase 4 exists.

Done when:

- Active courses can be listed.
- Course search resolves ambiguous names.
- Overview includes course, tabs, modules summary, assignments summary.
- `canvas-courses` matches the implemented command behavior.

### 3.2 Modules

Files:

```text
src/commands/modules.ts
skills/canvas-modules/SKILL.md
```

Commands:

```bash
canvas modules list --course-id <course-id>
canvas modules list --course-id <course-id> --include items,content_details
canvas modules items --course-id <course-id> --module-id <module-id>
canvas modules item --course-id <course-id> --module-id <module-id> --item-id <item-id>
canvas modules export --course-id <course-id> --module-id <module-id> --out <dir>
```

Skill work:

- Update `canvas-modules` with module list/items/item/export commands.
- Document module item types: Page, File, Assignment, Quiz, Discussion, ExternalUrl, ExternalTool, SubHeader.
- Document fallback from inline `items` to `canvas modules items`.
- Document that module order and item order must be preserved.

Done when:

- Inline module items work.
- Missing inline items fallback works.
- Module order and item order are preserved.
- `canvas-modules` matches the implemented traversal behavior.

### 3.3 Pages

Files:

```text
src/commands/pages.ts
src/core/html.ts
skills/canvas-pages/SKILL.md
skills/canvas-review/SKILL.md
```

Commands:

```bash
canvas pages list --course-id <course-id>
canvas pages show --course-id <course-id> --page <url-or-id>
canvas pages front --course-id <course-id>
canvas pages export --course-id <course-id> --page <url-or-id> --out <dir>
```

Skill work:

- Add `canvas-pages` when page commands are implemented.
- Document Canvas page URL slugs versus IDs.
- Document HTML-to-Markdown behavior.
- Update `canvas-review` with how pages appear inside review packs.

Done when:

- Canvas HTML converts to Markdown.
- Source URLs are preserved in output metadata.
- Active content is stripped.
- `canvas-pages` and `canvas-review` describe page export behavior.

### 3.4 Files and Folders

Files:

```text
src/commands/files.ts
src/commands/folders.ts
src/core/download.ts
skills/canvas-files/SKILL.md
skills/canvas-review/SKILL.md
```

Commands:

```bash
canvas files list --course-id <course-id>
canvas files show <file-id>
canvas files download <file-id> --out <dir>
canvas files download-linked --course-id <course-id> --out <dir>
canvas folders list --course-id <course-id>
canvas folders path --course-id <course-id> --path <path>
```

Skill work:

- Update `canvas-files` with file list/show/download/download-linked/folder commands.
- Document safe download path behavior.
- Document linked-files default versus all-files explicit mode.
- Update `canvas-review` with file placement and citations behavior.

Done when:

- File metadata fetch works.
- File download writes safely under target dir.
- Path traversal is impossible.
- Duplicate filenames are handled.
- `canvas-files` matches download and folder behavior.

### 3.5 Assignments and Assignment Groups

Files:

```text
src/commands/assignments.ts
src/commands/assignment-groups.ts
skills/canvas-assignments/SKILL.md
skills/canvas-review/SKILL.md
```

Commands:

```bash
canvas assignments list --course-id <course-id>
canvas assignments list --course-id <course-id> --bucket upcoming
canvas assignments show --course-id <course-id> --assignment-id <assignment-id>
canvas assignments export --course-id <course-id> --assignment-id <assignment-id> --out <dir>
canvas assignment-groups list --course-id <course-id>
```

Skill work:

- Update `canvas-assignments` with list/show/export/group commands.
- Document due date and override expectations.
- Document assignment HTML-to-Markdown export.
- Document that submission data is not part of default assignment/review behavior.
- Update `canvas-review` with assignment placement in review packs.

Done when:

- Due dates are parsed but raw dates remain available.
- Assignment HTML exports to Markdown.
- Attachments are represented in metadata.
- `canvas-assignments` matches the implemented assignment behavior.

### 3.6 Remaining Student Read Surface

Files:

```text
src/commands/submissions.ts
src/commands/grades.ts
src/commands/quizzes.ts
src/commands/discussions.ts
src/commands/announcements.ts
src/commands/calendar.ts
src/commands/planner.ts
src/commands/todos.ts
src/commands/groups.ts
src/commands/conversations.ts
skills/canvas-grades/SKILL.md
skills/canvas-submissions/SKILL.md
skills/canvas-quizzes/SKILL.md
skills/canvas-discussions/SKILL.md
skills/canvas-calendar/SKILL.md
skills/canvas-groups/SKILL.md
skills/canvas-conversations/SKILL.md
```

Commands:

```bash
canvas submissions list --course-id <course-id>
canvas submissions show --course-id <course-id> --assignment-id <assignment-id>
canvas submissions download --course-id <course-id> --assignment-id <assignment-id> --out <dir>
canvas grades show --course-id <course-id>
canvas grades assignments --course-id <course-id>
canvas quizzes list --course-id <course-id>
canvas quizzes show --course-id <course-id> --quiz-id <quiz-id>
canvas discussions list --course-id <course-id>
canvas discussions show --course-id <course-id> --topic-id <topic-id>
canvas discussions view --course-id <course-id> --topic-id <topic-id>
canvas discussions export --course-id <course-id> --topic-id <topic-id> --out <dir>
canvas announcements list --course-id <course-id>
canvas calendar list --course-id <course-id>
canvas planner list
canvas todos list
canvas calendar export --course-id <course-id> --out <dir>
canvas groups list
canvas groups list --course-id <course-id>
canvas groups show <group-id>
canvas groups members <group-id>
canvas conversations list
canvas conversations show <conversation-id>
canvas conversations unread-count
```

Skill work:

- Add or update one skill per command family:
  - `canvas-grades`
  - `canvas-submissions`
  - `canvas-quizzes`
  - `canvas-discussions`
  - `canvas-calendar`
  - `canvas-groups`
  - `canvas-conversations`
- Mark sensitive read-only commands explicitly in each skill.
- Make clear that grades, submissions, conversations, and group member lists are not included in review packs by default.

Done when:

- Commands return normalized JSON.
- Sensitive commands are explicit and never used automatically by bootstrap/review pack unless included.
- Discussion 403/503 states are represented clearly.
- Each command family has a matching skill with examples.

## Phase 4: Post-Login Context Bootstrap

Goal: automatically create context after `canvas auth login`.

Files:

```text
src/commands/context.ts
src/workflows/context-bootstrap.ts
src/schemas/context.ts
skills/canvas-shared/SKILL.md
skills/canvas-courses/SKILL.md
skills/canvas-review/SKILL.md
```

Commands:

```bash
canvas context bootstrap
canvas context show
canvas context show --refresh
```

Automatic sequence:

```bash
canvas me
canvas courses list --active --page-all
canvas planner list --window current-semester --page-all
canvas calendar list --window current-semester --page-all
```

For each active course:

```bash
canvas tabs list --course-id <course-id>
canvas assignments list --course-id <course-id> --bucket upcoming --page-all
canvas modules list --course-id <course-id> --page-all
```

Fallback:

```bash
canvas assignments list --course-id <course-id> --bucket past --page-all
```

Build steps:

1. Implement context schema.
2. Implement active course detection.
3. Implement semester position heuristic:

- `unknown`
- `pre-term`
- `early`
- `middle`
- `late`
- `finals`
- `ended`

4. Write `~/.canvas/context.json`.
5. Add context bootstrap call at end of `canvas auth login`.
6. Ensure bootstrap failures do not invalidate successful auth.
7. Print compact summary after login.
8. Update `canvas-shared` with automatic post-login bootstrap behavior.
9. Update `canvas-courses` to prefer `canvas context show` before refetching courses.
10. Update `canvas-review` to inspect context before course selection.

Done when:

- Login writes both config and context.
- `canvas context show` reads cache without network.
- `canvas context show --refresh` refreshes from Canvas.
- Bootstrap does not run heavy/private commands.
- Shared/courses/review skills describe context bootstrap and cache usage.

## Phase 5: Review Pack

Goal: implement the flagship workflow.

Files:

```text
src/commands/review.ts
src/workflows/review-pack.ts
src/workflows/local-search.ts
src/schemas/manifest.ts
skills/canvas-review/SKILL.md
```

Commands:

```bash
canvas review pack --course-id <course-id> --out <dir>
canvas review pack --course "<course name or code>" --out <dir>
canvas review pack --course-id <course-id> --module <module-id-or-name> --out <dir>
canvas review index --path <pack-dir>
canvas review search --path <pack-dir> --query <query>
```

Build steps:

1. Resolve course by ID or name.
2. Create course-rooted output folder.
3. Fetch course metadata.
4. Fetch tabs.
5. Fetch modules and module items.
6. Preserve module/item order.
7. Resolve item types:

- Page
- File
- Assignment
- Quiz
- Discussion
- ExternalUrl
- ExternalTool
- SubHeader

8. Export pages to Markdown.
9. Export assignments to Markdown.
10. Export quiz metadata.
11. Export discussion prompts and announcements.
12. Download linked files.
13. Record locked/unavailable/external resources as warnings.
14. Write:

```text
manifest.json
index.md
course.json
citations.json
fetch-log.ndjson
canvas-structure.json
```

15. Support optional includes:

```bash
--include grades
--include submissions
--include conversations
--include all-files
--include full-discussions
```

16. Update `canvas-review` with:

- exact review pack commands
- output layout
- manifest/citation behavior
- default includes/excludes
- optional include flags
- locked/unavailable/external resource handling

Done when:

- Review pack preserves Canvas course structure.
- Course is the top-level unit.
- Manifests are valid JSON.
- LLM can inspect `manifest.json` and navigate local files.
- No private/sensitive data is included by default.
- `canvas-review` is enough for an agent to create and inspect a review pack.

## Phase 6: Raw API Read-Only Escape Hatch

Goal: support uncovered read-only Canvas endpoints safely.

Files:

```text
src/commands/api.ts
skills/canvas-shared/SKILL.md
```

Command:

```bash
canvas api get /api/v1/courses
canvas api get /api/v1/courses/123/modules --params '{"include":["items"]}'
```

Build steps:

1. Implement GET only.
2. Validate path starts with `/api/v1/`.
3. Parse `--params` JSON.
4. Deny `as_user_id`.
5. Apply sensitive/admin endpoint denylist.
6. Support pagination flags.
7. Redact output/errors.
8. Update `canvas-shared` with raw API usage rules and examples.

Done when:

- GET works.
- POST/PUT/PATCH/DELETE do not exist.
- Raw command cannot masquerade.
- `canvas-shared` documents raw API behavior and restrictions.

## Phase 7: Skills Packaging and Public Release

Goal: package the CLI and already-coupled skills for public use.

The skills should already exist by this point because every feature phase owns its matching skill updates.

Build steps:

1. Confirm every implemented command has matching skill documentation.
2. Ensure every domain skill says to read `../canvas-shared/SKILL.md` first.
3. Ensure skills are included in npm `files`.
4. Support canonical skill install:

```bash
npx skills add @lukeguo12210/canvas-lms-cli -g -y
```

5. Optional fallback:

```bash
canvas skills install
canvas skills install --dry-run
canvas skills install --target codex
canvas skills install --target claude
```

6. Confirm npm package name:

- `@lukeguo12210/canvas-lms-cli`

7. Add README install docs.
8. Add license.
9. Add changelog.
10. Add security notes for PATs.
11. Add examples:

```bash
npm install -g @lukeguo12210/canvas-lms-cli
canvas auth login
canvas context show
canvas courses list
canvas review pack --course-id <id> --out ./review/<course>
npx skills add @lukeguo12210/canvas-lms-cli -g -y
```

12. Add CI:

- install
- typecheck
- test
- build

13. Publish dry run:

```bash
npm pack --dry-run
```

14. Publish public package.

Done when:

- Fresh machine install works.
- `canvas --help` works globally.
- Skills are packaged.
- README matches implemented commands.
- At least one agent environment can install and load skills.
- Agent can follow skills to run auth, inspect context, and create review pack.

## Suggested Implementation Order

Strict order:

1. Phase 0: Project Scaffold
2. Phase 1: Core Runtime
3. Phase 2: School Registry and Auth Login
4. Phase 3.1: Courses and Tabs
5. Phase 3.2: Modules
6. Phase 3.5: Assignments
7. Phase 3.3: Pages
8. Phase 3.4: Files and Folders
9. Phase 4: Post-Login Context Bootstrap
10. Phase 5: Review Pack
11. Phase 3.6: Remaining Student Read Surface
12. Phase 6: Raw API Read-Only Escape Hatch
13. Phase 7: Skills Packaging and Public Release

Reasoning:

- Auth and context need courses/tabs/modules/assignments.
- Review pack needs modules/pages/files/assignments.
- Skills are written alongside each feature so agent behavior stays aligned with the CLI.
