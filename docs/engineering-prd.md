# Engineering PRD: Canvas Student Agent CLI

## 1. Summary

Build `@lukeguo12210/canvas-lms-cli`, an agent-native TypeScript/Node CLI and skills bundle for students to authenticate with Canvas LMS using a personal access token, pull all student-facing read-only Canvas information, and create structured local study/review packs that LLM agents can understand and use.

The npm package name is `@lukeguo12210/canvas-lms-cli`. The repository/project name can remain `canvas-cli`. The installed command is `canvas`.

MVP flagship workflow:

```bash
canvas auth login
canvas review pack --course-id 123 --out ./review/cs101-midterm
```

Primary user:

- A student using Codex, Claude Code, or another LLM agent locally.

Non-goals for MVP:

- Hosted multi-user app.
- OAuth or school-approved developer key flow.
- Instructor/admin workflows.
- Any write operation to Canvas.

Future direction:

- Add write-capable student workflows later, such as assignment submission or discussion replies, with separate command gates and dedicated skills.

## 2. Product Decisions

Current decisions from planning:

- Audience: students only.
- Auth: personal access token only for MVP.
- Login UX: interactive `canvas auth login`.
- School URL resolution: school picker with known Canvas URLs plus "Add your own".
- CLI style: simple Canvas-native commands, not Lark's generated resource/method command hierarchy.
- Implementation: TypeScript/Node.
- Distribution: npm package plus agent skills install.
- Token storage: local config is acceptable for MVP.
- Output: agent-first structured data, still understandable by humans.
- Review pack structure: preserve exact Canvas course structure, with course as the top-level unit.
- Flagship workflow: review pack creation.
- Scope: all student-facing read-only Canvas features through explicit functions and commands.
- Publishing target: public npm package and public repository.

## 3. Lark-Inspired Design Principles

Use `larksuite/cli` as the bundle design reference, but adapt it for Canvas and TypeScript.

What to copy conceptually:

- A single CLI that is useful to humans and agents.
- Structured JSON output by default.
- Human-friendly output as an option.
- Interactive auth setup.
- Domain-specific commands.
- High-level shortcuts/workflows.
- Raw API escape hatch.
- Skills that teach agents how to operate the CLI.
- A shared skill for auth, pagination, safety, and resource semantics.
- Domain skills that are practical operating manuals, not generic docs.

What not to copy exactly:

- Lark's three-layer generated command hierarchy.
- Lark's OAuth/device-code flow.
- Go implementation and prebuilt binary architecture.

Canvas-specific command philosophy:

- Prefer clear student-facing nouns: `courses`, `modules`, `assignments`, `files`, `grades`, `conversations`.
- Prefer verbs that match user intent: `list`, `show`, `download`, `export`, `pack`, `search`.
- Keep raw API as `canvas api get ...` for uncovered read-only cases.

## 4. Auth UX

### 4.1 Command

```bash
canvas auth login
```

`canvas auth login` starts a PAT setup flow directly. No `--type` flag is needed because PAT is the only MVP credential type.

### 4.2 Interactive Flow

1. Show searchable/selectable school list.
2. User selects school or chooses "Not found? Add your own".
3. Resolve Canvas base URL.
4. Print detailed PAT creation instructions.
5. Ask user to press Enter to open the Canvas settings page.
6. Open browser to:

```text
<baseUrl>/profile/settings
```

7. CLI enters pending state.
8. User creates PAT in Canvas, copies token, returns to terminal.
9. CLI prompts for token using hidden input.
10. CLI validates token with a low-risk read-only request.
11. CLI writes local config.
12. CLI automatically runs post-login context bootstrap.
13. CLI writes local context cache.
14. CLI prints success state, compact context summary, and next recommended command.

### 4.3 Instruction Copy

For Columbia:

```text
Canvas token setup for Columbia University (CourseWorks)

1. Go to https://courseworks2.columbia.edu/profile/settings
2. Click "+ New Access Token"
3. Enter "Hyperknow" as the purpose
4. Optionally set an expiration date
5. Click "Generate Token"
6. Copy the token and paste it back here
```

The purpose string should default to `Hyperknow`. Add a config constant so it can be changed later.

### 4.4 School Registry

Initial bundled registry:

```json
[
  {"name":"Brown University","url":"https://canvas.brown.edu"},
  {"name":"Carnegie Mellon University","url":"https://canvas.cmu.edu"},
  {"name":"Columbia University (CourseWorks)","url":"https://courseworks2.columbia.edu"},
  {"name":"Cornell University","url":"https://canvas.cornell.edu"},
  {"name":"Dartmouth College","url":"https://canvas.dartmouth.edu"},
  {"name":"Duke University","url":"https://go.canvas.duke.edu"},
  {"name":"Emory University","url":"https://canvas.emory.edu"},
  {"name":"Georgetown University","url":"https://canvas.georgetown.edu"},
  {"name":"Georgia Institute of Technology","url":"https://canvas.gatech.edu"},
  {"name":"Harvard University","url":"https://canvas.harvard.edu"},
  {"name":"Massachusetts Institute of Technology (MIT)","url":"https://canvas.mit.edu"},
  {"name":"Northeastern University","url":"https://canvas.northeastern.edu"},
  {"name":"Northwestern University","url":"https://canvas.northwestern.edu"},
  {"name":"Ohio State University","url":"https://canvas.osu.edu"},
  {"name":"Pennsylvania State University","url":"https://canvas.psu.edu"},
  {"name":"Princeton University","url":"https://canvas.princeton.edu"},
  {"name":"Rice University","url":"https://canvas.rice.edu"},
  {"name":"Stanford University","url":"https://canvas.stanford.edu"},
  {"name":"Tufts University","url":"https://canvas.tufts.edu"},
  {"name":"University of California, Berkeley (bCourses)","url":"https://bcourses.berkeley.edu"},
  {"name":"University of California, Davis","url":"https://canvas.ucdavis.edu"},
  {"name":"University of California, Irvine","url":"https://canvas.eee.uci.edu"},
  {"name":"University of California, Los Angeles (Bruin Learn)","url":"https://bruinlearn.ucla.edu"},
  {"name":"University of California, San Diego","url":"https://canvas.ucsd.edu"},
  {"name":"University of California, Santa Barbara","url":"https://canvas.ucsb.edu"},
  {"name":"University of California, Santa Cruz","url":"https://canvas.ucsc.edu"},
  {"name":"University of Chicago","url":"https://canvas.uchicago.edu"},
  {"name":"University of Michigan","url":"https://canvas.umich.edu"},
  {"name":"University of North Carolina at Chapel Hill","url":"https://canvas.unc.edu"},
  {"name":"University of Notre Dame","url":"https://canvas.nd.edu"},
  {"name":"University of Pennsylvania","url":"https://canvas.upenn.edu"},
  {"name":"University of Southern California","url":"https://canvas.usc.edu"},
  {"name":"University of Virginia","url":"https://canvas.its.virginia.edu"},
  {"name":"University of Washington","url":"https://canvas.uw.edu"},
  {"name":"Yale University","url":"https://canvas.yale.edu"}
]
```

`Not found? Add your own` asks for:

- School display name.
- Canvas base URL.

The CLI should normalize the URL:

- Require `https://`.
- Remove trailing slash.
- Reject URLs that contain `/api/`.
- Probe `<baseUrl>/api/v1/courses` after token entry.

### 4.5 Local Config

MVP local config path:

```text
~/.canvas/config.json
```

Example:

```json
{
  "version": 1,
  "activeProfile": "default",
  "profiles": {
    "default": {
      "schoolName": "Columbia University (CourseWorks)",
      "baseUrl": "https://courseworks2.columbia.edu",
      "token": "redacted-at-runtime",
      "createdAt": "2026-05-29T00:00:00.000Z",
      "validatedAt": "2026-05-29T00:00:00.000Z",
      "user": {
        "id": "123",
        "name": "Student Name"
      }
    }
  }
}
```

Security requirements:

- Create config directory with `0700` permissions where supported.
- Create config file with `0600` permissions where supported.
- Never print token.
- Redact `Authorization`, `access_token`, `token`, and copied URLs containing secrets.
- `canvas auth status` must show token presence but never token value.

Future:

- Optional OS keychain support.
- Multiple profiles.
- Remote school registry updates.

## 5. Output Contract

Output is agent-first.

Default output:

```bash
canvas courses list
```

prints JSON:

```json
{
  "ok": true,
  "data": [],
  "meta": {
    "baseUrl": "https://courseworks2.columbia.edu",
    "request": {
      "method": "GET",
      "path": "/api/v1/courses"
    },
    "pagination": {
      "pagesFetched": 1,
      "hasNext": false
    }
  }
}
```

Supported output flags:

```bash
--format json      # default
--format pretty    # readable terminal summary
--format table     # for simple list commands
--format ndjson    # streaming/batch-friendly
--output <path>    # write result to file
```

Agent contract:

- JSON envelope is stable.
- `data` contains normalized Canvas entities.
- `raw` is available only with `--include-raw`.
- `meta.request` records method/path/query without token.
- Errors use stable `code` values.

Error shape:

```json
{
  "ok": false,
  "error": {
    "code": "CANVAS_UNAUTHORIZED",
    "message": "Canvas rejected the token. Run canvas auth login again.",
    "status": 401,
    "retryable": false
  }
}
```

## 6. Core Engineering Structure

### 6.1 Runtime

- Language: TypeScript.
- Runtime: Node.js 20+.
- Package manager: npm.
- Build: `tsup` or `tsx` for dev, `tsup` for distribution.
- CLI parser: `commander` or `clipanion`.
- Prompts: `@inquirer/prompts`.
- Browser open: `open`.
- HTTP client: `undici`.
- HTML to Markdown: `turndown` plus Canvas-specific transforms.
- Validation: `zod`.
- Tests: `vitest`.

Recommended because it keeps npm distribution and skill publishing simple.

### 6.2 Repository Layout

```text
canvas-cli/
  package.json
  tsconfig.json
  tsup.config.ts
  src/
    bin/
      canvas.ts
    commands/
      auth.ts
      courses.ts
      modules.ts
      pages.ts
      files.ts
      assignments.ts
      submissions.ts
      grades.ts
      quizzes.ts
      discussions.ts
      announcements.ts
      calendar.ts
      planner.ts
      groups.ts
      conversations.ts
      tabs.ts
      review.ts
      api.ts
      skills.ts
    core/
      canvas-client.ts
      config-store.ts
      output.ts
      pagination.ts
      errors.ts
      redaction.ts
      rate-limit.ts
      ids.ts
      html.ts
      paths.ts
      download.ts
    registry/
      schools.ts
    workflows/
      review-pack.ts
      course-sync.ts
      local-search.ts
    schemas/
      canvas.ts
      commands.ts
      manifest.ts
    skills/
      installer.ts
  skills/
    canvas-shared/
      SKILL.md
      references/
        auth.md
        pagination.md
        output.md
    canvas-courses/
      SKILL.md
    canvas-modules/
      SKILL.md
    canvas-files/
      SKILL.md
    canvas-assignments/
      SKILL.md
    canvas-review/
      SKILL.md
  docs/
    engineering-prd.md
    read-only-first.md
```

### 6.3 Package Entrypoints

`package.json`:

```json
{
  "name": "@lukeguo12210/canvas-lms-cli",
  "bin": {
    "canvas": "dist/bin/canvas.js"
  },
  "files": [
    "dist",
    "skills",
    "README.md"
  ]
}
```

The binary should remain `canvas`.

## 7. Canvas Client Requirements

### 7.1 Request Handling

All requests use:

```text
Authorization: Bearer <PAT>
Accept: application/json
```

Recommended header:

```text
Accept: application/json+canvas-string-ids
```

Canvas supports this header to return integer IDs as strings, which avoids JavaScript large integer issues.

### 7.2 Pagination

Canvas uses RFC 5988-style `Link` headers. The client must follow the `rel="next"` URL instead of constructing the next page itself.

Flags:

```bash
--page-all
--page-limit <n>
--page-size <n>
--page-delay <ms>
```

Default:

- Single page for direct list commands.
- `--page-all` enabled by default for review pack workflows.
- Hard workflow page cap with clear error if exceeded.

### 7.3 Read-Only Enforcement

MVP allows only GET requests.

`canvas api` command:

```bash
canvas api get /api/v1/courses
```

Rules:

- Only `get` exists in MVP.
- No `post`, `put`, `patch`, or `delete` subcommands.
- Reject `as_user_id` and masquerading parameters.
- Deny high-risk admin-style read endpoints unless later explicitly supported.

This matters because PATs may have broad permissions. The CLI must constrain behavior itself.

## 8. Detailed Feature Matrix

This section is the implementation checklist for all student-facing read-only MVP features.

### 8.1 Auth and Profile

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| Interactive PAT setup | `canvas auth login` | `GET /api/v1/users/self/profile` or `GET /api/v1/courses` | Opens `<baseUrl>/profile/settings`, stores local config. |
| Show auth state | `canvas auth status` | Optional validation request | Never prints token. |
| Remove local token | `canvas auth logout` | None | Local config mutation only. |
| Show active Canvas base URL | `canvas config show` | None | Redacted config. |
| Switch profile | `canvas config use <profile>` | None | Optional v1.1 if multiple profiles. |
| Build local context cache | `canvas context bootstrap` | Multiple read-only calls | Also runs automatically after `canvas auth login`. |
| Show cached context | `canvas context show` | None by default | Reads `~/.canvas/context.json`; `--refresh` reruns bootstrap. |

### 8.2 Self and Profile

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| Show current user profile | `canvas me` | `GET /api/v1/users/self/profile` | Validate auth and display current user. |
| Show user dashboard summary | `canvas me summary` | Courses, planner, calendar | Aggregated local command. |

### 8.3 Courses

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| List current courses | `canvas courses list` | `GET /api/v1/courses` | Include term, enrollment type, favorite state when available. |
| Search courses locally | `canvas courses search <query>` | `GET /api/v1/courses` | Fetch then fuzzy match. |
| Show course | `canvas courses show <course-id>` | `GET /api/v1/courses/:course_id` | Include `include[]=term`, `include[]=course_image` where useful. |
| Course overview | `canvas courses overview <course-id>` | Courses + tabs + modules + assignments | Agent-first summary. |
| List course tabs | `canvas tabs list --course-id <id>` | `GET /api/v1/courses/:course_id/tabs` | Helps agents discover course setup. |

### 8.4 Modules

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| List modules | `canvas modules list --course-id <id>` | `GET /api/v1/courses/:course_id/modules` | Supports `--include items,content_details`. |
| List module items | `canvas modules items --course-id <id> --module-id <id>` | `GET /api/v1/courses/:course_id/modules/:module_id/items` | Fallback when Canvas omits inline items. |
| Show module item | `canvas modules item --course-id <id> --module-id <id> --item-id <id>` | `GET /api/v1/courses/:course_id/modules/:module_id/items/:item_id` | Resolve item type and content URL. |
| Export module | `canvas modules export --course-id <id> --module-id <id> --out <dir>` | Multiple GETs | Writes local module bundle. |

### 8.5 Pages

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| List pages | `canvas pages list --course-id <id>` | `GET /api/v1/courses/:course_id/pages` | Paginated. |
| Show page | `canvas pages show --course-id <id> --page <url-or-id>` | `GET /api/v1/courses/:course_id/pages/:url_or_id` | Use `page_id:<id>` when explicit ID is needed. |
| Show front page | `canvas pages front --course-id <id>` | `GET /api/v1/courses/:course_id/front_page` | Useful for course landing pages. |
| Export page Markdown | `canvas pages export --course-id <id> --page <url-or-id> --out <dir>` | Page GET | HTML to Markdown with source links. |

### 8.6 Files and Folders

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| List course files | `canvas files list --course-id <id>` | `GET /api/v1/courses/:course_id/files` | Paginated, respect lock/hidden fields. |
| Show file metadata | `canvas files show <file-id>` | `GET /api/v1/files/:id` | Includes display name, size, content type, URL. |
| Download file | `canvas files download <file-id> --out <dir>` | `GET /api/v1/files/:id`, file URL | Normalize filename and prevent path traversal. |
| List folders | `canvas folders list --course-id <id>` | `GET /api/v1/courses/:course_id/folders` | Flat list. |
| Resolve folder path | `canvas folders path --course-id <id> --path <path>` | `GET /api/v1/courses/:course_id/folders/by_path/*full_path` | Useful for course file browsing. |
| Download linked files | `canvas files download-linked --course-id <id> --out <dir>` | Pages/modules/assignments + files | Default behavior for review packs. |

### 8.7 Assignments and Assignment Groups

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| List assignments | `canvas assignments list --course-id <id>` | `GET /api/v1/courses/:course_id/assignments` | Support `--bucket`, `--search`, `--order-by due_at`. |
| Show assignment | `canvas assignments show --course-id <id> --assignment-id <id>` | `GET /api/v1/courses/:course_id/assignments/:id` | Include description, due dates, submission types. |
| Export assignment | `canvas assignments export --course-id <id> --assignment-id <id> --out <dir>` | Assignment GET + attachments | Markdown. |
| List assignment groups | `canvas assignment-groups list --course-id <id>` | `GET /api/v1/courses/:course_id/assignment_groups` | Useful for grade categories. |

### 8.8 Submissions and Grades

These are student-facing and read-only, but sensitive. They should be explicit commands and excluded from review packs by default.

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| List own assignment submissions | `canvas submissions list --course-id <id>` | Assignment list with `include[]=submission`, or submissions endpoints where available | Normalize current user's submission state. |
| Show own submission for assignment | `canvas submissions show --course-id <id> --assignment-id <id>` | Assignment with `include[]=submission` or submission show endpoint | Include submitted_at, workflow_state, grade if visible. |
| Download submitted attachments | `canvas submissions download --course-id <id> --assignment-id <id> --out <dir>` | Submission attachments + file URLs | Optional, explicit only. |
| Show course grade | `canvas grades show --course-id <id>` | Courses/enrollments/assignment groups depending availability | Keep source transparent because schools vary. |
| List graded assignments | `canvas grades assignments --course-id <id>` | Assignments with `include[]=submission` | Agent-friendly grade table. |

### 8.9 Quizzes

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| List quizzes | `canvas quizzes list --course-id <id>` | `GET /api/v1/courses/:course_id/quizzes` | Read metadata only. |
| Show quiz | `canvas quizzes show --course-id <id> --quiz-id <id>` | `GET /api/v1/courses/:course_id/quizzes/:id` | No quiz-taking in MVP. |

### 8.10 Discussions and Announcements

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| List discussions | `canvas discussions list --course-id <id>` | `GET /api/v1/courses/:course_id/discussion_topics` | Support search and unread filters. |
| Show discussion topic | `canvas discussions show --course-id <id> --topic-id <id>` | `GET /api/v1/courses/:course_id/discussion_topics/:topic_id` | Topic metadata/message. |
| Fetch full discussion | `canvas discussions view --course-id <id> --topic-id <id>` | `GET /api/v1/courses/:course_id/discussion_topics/:topic_id/view` | May 403 on require-initial-post; may 503 if cache unavailable. |
| Export discussion | `canvas discussions export --course-id <id> --topic-id <id> --out <dir>` | Discussion GET/view | Markdown thread when allowed. |
| List announcements | `canvas announcements list --course-id <id>` | `GET /api/v1/announcements?context_codes[]=course_<id>` | Course announcements are a specialized discussion surface. |

### 8.11 Calendar, Planner, Todos

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| List calendar events | `canvas calendar list --course-id <id>` | `GET /api/v1/calendar_events` | Use `context_codes[]=course_<id>`. |
| List planner items | `canvas planner list` | `GET /api/v1/planner/items` | Date range support. |
| List todos | `canvas todos list` | Planner and assignment buckets | Student task overview. |
| Export agenda | `canvas calendar export --course-id <id> --out <dir>` | Calendar GET | Markdown/JSON agenda. |

### 8.12 Groups

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| List my groups | `canvas groups list` | `GET /api/v1/users/self/groups` | Active groups for current user. |
| List course groups visible to user | `canvas groups list --course-id <id>` | `GET /api/v1/courses/:course_id/groups` | Use `only_own_groups=true` by default. |
| Show group | `canvas groups show <group-id>` | `GET /api/v1/groups/:group_id` | Include permissions if useful. |
| List group members | `canvas groups members <group-id>` | `GET /api/v1/groups/:group_id/users` | Sensitive; explicit command only. |
| List group files | `canvas files list --group-id <id>` | `GET /api/v1/groups/:group_id/files` | If accessible. |

### 8.13 Conversations

Canvas conversations are student-facing but private. Support read-only commands, but never include them in review packs.

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| List conversations | `canvas conversations list` | `GET /api/v1/conversations` | Default excludes archived like Canvas API. |
| Show conversation | `canvas conversations show <conversation-id>` | `GET /api/v1/conversations/:id` | Pass `auto_mark_as_read=false` if supported to avoid side effects. |
| Unread count | `canvas conversations unread-count` | `GET /api/v1/conversations/unread_count` | Read-only. |

### 8.14 Raw API

| Action | Command | Canvas API | Notes |
|---|---|---|---|
| Raw GET | `canvas api get /api/v1/courses` | Any allowed GET | Escape hatch for agents. |
| Raw GET with params | `canvas api get /api/v1/courses/123/modules --params '{"include":["items"]}'` | Any allowed GET | JSON params. |

MVP raw API restrictions:

- `canvas api get` only.
- No write methods.
- Deny `as_user_id`.
- Redact all secrets in dry-run and error output.

## 9. Post-Login Context Bootstrap

After `canvas auth login` succeeds, the CLI should automatically gather a lightweight, read-only student context snapshot. This gives agents immediate awareness of who the user is, which school they are using, what courses they are taking, and where the user appears to be in the semester.

The same behavior should be available manually:

```bash
canvas context bootstrap
canvas context show
canvas context show --refresh
```

### 9.1 Automatic Tool Sequence

Run these commands after login:

```bash
canvas me
canvas courses list --active --page-all
canvas planner list --window current-semester --page-all
canvas calendar list --window current-semester --page-all
```

Then, for each active course:

```bash
canvas tabs list --course-id <course-id>
canvas assignments list --course-id <course-id> --bucket upcoming --page-all
canvas modules list --course-id <course-id> --page-all
```

Optional fallback when semester position is unclear:

```bash
canvas assignments list --course-id <course-id> --bucket past --page-all
```

### 9.2 Underlying API Calls

| Context Item | Command | Canvas API |
|---|---|---|
| Current user | `canvas me` | `GET /api/v1/users/self/profile` |
| Active courses | `canvas courses list --active --page-all` | `GET /api/v1/courses` |
| Planner items | `canvas planner list --window current-semester --page-all` | `GET /api/v1/planner/items` |
| Calendar events | `canvas calendar list --window current-semester --page-all` | `GET /api/v1/calendar_events` |
| Course tabs | `canvas tabs list --course-id <id>` | `GET /api/v1/courses/:course_id/tabs` |
| Upcoming assignments | `canvas assignments list --course-id <id> --bucket upcoming --page-all` | `GET /api/v1/courses/:course_id/assignments` |
| Course modules | `canvas modules list --course-id <id> --page-all` | `GET /api/v1/courses/:course_id/modules` |
| Past assignments fallback | `canvas assignments list --course-id <id> --bucket past --page-all` | `GET /api/v1/courses/:course_id/assignments` |

### 9.3 Local Context Cache

Write context to:

```text
~/.canvas/context.json
```

Shape:

```json
{
  "version": 1,
  "generatedAt": "2026-05-29T00:00:00.000Z",
  "profile": "default",
  "school": {
    "name": "Columbia University (CourseWorks)",
    "baseUrl": "https://courseworks2.columbia.edu"
  },
  "user": {
    "id": "123",
    "name": "Student Name",
    "sortableName": "Name, Student"
  },
  "semester": {
    "detectedLabel": "Spring 2026",
    "currentDate": "2026-05-29",
    "position": "late",
    "confidence": "medium",
    "signals": ["term_dates", "upcoming_assignments", "calendar_events"]
  },
  "courses": [
    {
      "id": "456",
      "name": "Intro to Computer Science",
      "courseCode": "COMS 1004",
      "term": "Spring 2026",
      "tabs": ["home", "modules", "assignments", "files"],
      "setup": {
        "hasModules": true,
        "hasFilesTab": true,
        "hasAssignments": true,
        "isModuleHeavy": true
      },
      "counts": {
        "modules": 12,
        "upcomingAssignments": 3
      }
    }
  ],
  "upcoming": [],
  "recent": [],
  "warnings": []
}
```

### 9.4 Semester Position Heuristics

The CLI should infer semester position using available signals:

- Course term name and start/end dates when Canvas exposes them.
- Assignment due dates.
- Calendar events.
- Planner items.
- Current date.

Position values:

- `unknown`
- `pre-term`
- `early`
- `middle`
- `late`
- `finals`
- `ended`

If confidence is low, report `unknown` or `confidence: low`; do not invent term dates.

### 9.5 Exclusions

Do not run these automatically after login:

- `canvas review pack`
- File downloads.
- Page exports.
- Discussion full views.
- Grades.
- Own submissions.
- Conversations.
- Group member lists.
- Raw API calls beyond wrapped bootstrap commands.

The bootstrap must stay light, read-only, and privacy-preserving.

### 9.6 Agent Summary

After bootstrap, print a compact human-readable summary plus JSON path:

```text
Authenticated as Student Name at Columbia University (CourseWorks).
Found 4 active courses and 9 upcoming items.
Semester position: late (medium confidence).
Context cache: ~/.canvas/context.json

Next: canvas review pack --course-id <course-id> --out ./review/<course>
```

## 10. Review Pack Workflow

### 10.1 Command

```bash
canvas review pack --course-id 123 --out ./review/cs101-midterm
```

Aliases:

```bash
canvas review pack --course "CS101"
canvas courses pack --course-id 123 --out ./review/cs101
```

### 10.2 Goals

Create an agent-first local representation of a course or subset of a course.

Output should allow an LLM to:

- Understand course structure.
- Find source material.
- Cite Canvas URLs.
- Answer study questions.
- Generate review plans.
- Track missing/locked/unavailable content.

### 10.3 Defaults

Default included:

- Course metadata.
- Tabs/navigation summary.
- Modules and module items.
- Pages linked from modules.
- Assignment descriptions and due dates.
- Quiz metadata.
- Discussion prompts and announcements.
- Linked course files.
- Calendar/planner items for the course.

Default excluded:

- Grades.
- Own submissions.
- Conversation messages.
- Group member lists.
- Full discussion replies if require-initial-post blocks access.

Optional flags:

```bash
--include grades
--include submissions
--include conversations
--include all-files
--include full-discussions
--since <date>
--until <date>
--module <module-id-or-name>
--assignment <assignment-id-or-name>
```

### 10.4 Output Layout

```text
review-pack/
  course-123-intro-to-computer-science/
    manifest.json
    index.md
    course.json
    citations.json
    fetch-log.ndjson
    canvas-structure.json
    tabs/
      tabs.json
    modules/
      001-introduction/
        module.json
        index.md
        items.json
        001-page-week-1-notes.md
        002-file-syllabus.pdf
      002-recursion/
        module.json
        index.md
        items.json
    pages/
      week-1-notes.md
    assignments/
      homework-1/
        assignment.json
        index.md
    quizzes/
    discussions/
    announcements/
    calendar/
    files/
      by-id/
      by-canvas-folder/
    raw/
```

The pack root may contain multiple courses in the future, but each course must remain a separate top-level folder. Inside a course folder, preserve the Canvas structure first. Cross-cutting folders such as `pages/`, `assignments/`, and `files/` are allowed as indexes or de-duplicated resource stores, but module folders must retain the course's visible module order and item order.

### 10.5 Manifest Shape

```json
{
  "version": 1,
  "generatedAt": "2026-05-29T00:00:00.000Z",
  "baseUrl": "https://courseworks2.columbia.edu",
  "course": {
    "id": "123",
    "name": "Intro to Computer Science",
    "root": "course-123-intro-to-computer-science"
  },
  "structurePolicy": "preserve-canvas-course-structure",
  "included": ["modules", "pages", "assignments", "files", "calendar"],
  "excluded": ["grades", "submissions", "conversations"],
  "items": [
    {
      "id": "module_item:456",
      "type": "Page",
      "title": "Week 1 Notes",
      "source": {
        "apiUrl": "/api/v1/courses/123/pages/week-1-notes",
        "htmlUrl": "https://courseworks2.columbia.edu/courses/123/pages/week-1-notes"
      },
      "local": {
        "path": "pages/week-1-notes.md",
        "contentType": "text/markdown"
      }
    }
  ],
  "warnings": []
}
```

### 10.6 Dynamic Course Handling

Canvas courses vary a lot. The packer should be self-aware:

- If modules are empty, inspect tabs and pages.
- If a course hides Files, still download files linked from pages/assignments when allowed.
- If module items omit inline items, fetch module items per module.
- If a page is locked, record lock info instead of failing the whole pack.
- If a discussion requires initial post, record `require_initial_post`.
- If a file URL is unavailable, record metadata and source page.
- If external tools appear, record launch/title/html URL but do not try to scrape external systems.

## 11. Skills Bundle

### 11.1 Install UX

Preferred public install:

```bash
npm install -g @lukeguo12210/canvas-lms-cli
npx skills add @lukeguo12210/canvas-lms-cli -g -y
```

CLI-assisted install can also be supported:

```bash
canvas skills install
```

`npx skills add @lukeguo12210/canvas-lms-cli -g -y` is the canonical package-based path. `canvas skills install` is a convenience wrapper and fallback for environments where the skills CLI is unavailable.

`canvas skills install` should detect likely agent skill folders and copy bundled skills:

- Codex global skills folder.
- Claude Code user skills folder.
- Project-local `.agents/skills` or equivalent when requested.

The installer must be conservative:

- Show target before writing.
- Support `--dry-run`.
- Support `--target codex|claude|local`.

### 11.2 Exact Initial Skills

The MVP should ship these exact skills.

#### `canvas-shared`

Purpose:

- Required first-read skill for every Canvas task.
- Teaches auth, local PAT handling, output formats, pagination, raw API, and current MVP safety mode.

Frontmatter:

```yaml
---
name: canvas-shared
version: 1.0.0
description: "Canvas LMS shared rules: PAT auth, school URL setup, token safety, pagination, output formats, raw read-only API usage, and common Canvas error handling."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas --help"
---
```

Required content:

- How to run `canvas auth login`.
- School picker behavior and custom URL fallback.
- Never print PATs or config secrets.
- `canvas auth login` automatically runs context bootstrap after a successful login.
- `canvas context show` reads the cached post-login context.
- `canvas context show --refresh` reruns the bootstrap.
- Use `canvas auth status` before other workflows if auth is uncertain.
- Default output is JSON; use `--format pretty` only when presenting to user.
- Use `--page-all` when completeness matters.
- Canvas pagination follows `Link` headers.
- Raw escape hatch is `canvas api get <path>`.
- MVP cannot write to Canvas.
- Sensitive read-only data such as grades, submissions, conversations, and group members must be requested explicitly.
- Common errors: 401 invalid token, 403 locked/unpublished/permission denied, 404 unavailable resource, 503 discussion cache not ready, 429/rate limiting.

#### `canvas-courses`

Purpose:

- Course discovery, course disambiguation, course overview, and top-level course structure.

Frontmatter:

```yaml
---
name: canvas-courses
version: 1.0.0
description: "Canvas LMS courses: list active courses, disambiguate course names, inspect course overview, tabs, and top-level student-visible course structure."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas courses --help"
---
```

Required commands:

```bash
canvas courses list
canvas courses search <query>
canvas courses show <course-id>
canvas courses overview <course-id>
canvas tabs list --course-id <course-id>
```

Required content:

- Always prefer course ID once known.
- If user names a course ambiguously, use `canvas courses search`.
- After login, inspect `canvas context show` before listing courses again.
- Course names may be nicknames or school-specific labels.
- Use tabs to understand whether the course is module-heavy, page-heavy, file-heavy, or tool-heavy.
- For "pull this class" or "review this course", hand off to `canvas-review`.

#### `canvas-modules`

Purpose:

- Traverse the canonical Canvas course learning path.

Frontmatter:

```yaml
---
name: canvas-modules
version: 1.0.0
description: "Canvas LMS modules: list modules, traverse module items, and resolve Canvas pages, files, assignments, quizzes, discussions, and external URLs in course order."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas modules --help"
---
```

Required commands:

```bash
canvas modules list --course-id <course-id>
canvas modules list --course-id <course-id> --include items,content_details
canvas modules items --course-id <course-id> --module-id <module-id>
canvas modules item --course-id <course-id> --module-id <module-id> --item-id <item-id>
canvas modules export --course-id <course-id> --module-id <module-id> --out <dir>
```

Required content:

- Canvas may omit inline `items`; fall back to `canvas modules items`.
- Preserve module order and item order.
- Module item types include Page, File, Assignment, Quiz, Discussion, ExternalUrl, ExternalTool, SubHeader.
- Locked module items should be recorded with lock info instead of treated as fatal.
- For full-course export, use `canvas review pack`.

#### `canvas-files`

Purpose:

- File and folder metadata, safe downloads, and linked-file resolution.

Frontmatter:

```yaml
---
name: canvas-files
version: 1.0.0
description: "Canvas LMS files: list course files and folders, inspect file metadata, download accessible files safely, and resolve files linked from modules, pages, and assignments."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas files --help"
---
```

Required commands:

```bash
canvas files list --course-id <course-id>
canvas files show <file-id>
canvas files download <file-id> --out <dir>
canvas files download-linked --course-id <course-id> --out <dir>
canvas folders list --course-id <course-id>
canvas folders path --course-id <course-id> --path <path>
```

Required content:

- Prefer linked files for review packs.
- Use `--include all-files` only when user asks for every visible course file.
- Download paths must be sanitized.
- Preserve Canvas file display names in metadata.
- Record source API URL and source HTML URL in manifests.

#### `canvas-assignments`

Purpose:

- Assignment and deadline retrieval for student review.

Frontmatter:

```yaml
---
name: canvas-assignments
version: 1.0.0
description: "Canvas LMS assignments: list assignments, inspect assignment details, due dates, submission types, descriptions, visible attachments, and assignment groups."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas assignments --help"
---
```

Required commands:

```bash
canvas assignments list --course-id <course-id>
canvas assignments list --course-id <course-id> --bucket upcoming
canvas assignments show --course-id <course-id> --assignment-id <assignment-id>
canvas assignments export --course-id <course-id> --assignment-id <assignment-id> --out <dir>
canvas assignment-groups list --course-id <course-id>
```

Required content:

- Assignment descriptions are HTML and should be interpreted/exported as Markdown when writing local files.
- Due dates may be overridden per student; use Canvas-returned dates as authoritative.
- Submission data is sensitive and belongs to `canvas-grades`/future submission skills, not default review workflow.
- Assignment external tools should be linked, not scraped.

#### `canvas-review`

Purpose:

- Flagship study workflow that pulls course materials into a course-rooted local pack.

Frontmatter:

```yaml
---
name: canvas-review
version: 1.0.0
description: "Canvas LMS review packs: create agent-first local course exports that preserve Canvas course/module structure, cite sources, and organize materials for study sessions."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas review --help"
---
```

Required commands:

```bash
canvas review pack --course-id <course-id> --out <dir>
canvas review pack --course "<course name or code>" --out <dir>
canvas review pack --course-id <course-id> --module <module-id-or-name> --out <dir>
canvas review index --path <pack-dir>
canvas review search --path <pack-dir> --query <query>
```

Required content:

- Course is always the top-level unit.
- Before creating a review pack, inspect `canvas context show` to identify active courses, upcoming work, and likely current semester position.
- Preserve Canvas structure first: course, tabs, modules, module items, pages, assignments, files, discussions, announcements, calendar.
- Use manifests and indexes to make preserved structure easy for agents to parse.
- Default excludes grades, submissions, conversations, and group member lists.
- Use optional includes only when user explicitly asks.
- Record unavailable, locked, external, or skipped resources as warnings, not silent omissions.
- Always cite Canvas source URLs in `citations.json`.

Near-term:

- `canvas-grades`
- `canvas-discussions`
- `canvas-calendar`
- `canvas-groups`
- `canvas-conversations`

Future write-capable:

- `canvas-submissions`
- `canvas-discussions-write`
- `canvas-instructor`

### 11.3 Skill Structure

Each skill follows Lark's high-signal pattern:

```yaml
---
name: canvas-modules
version: 1.0.0
description: "Canvas LMS modules: list modules, traverse module items, and resolve course materials for student review workflows."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas modules --help"
---
```

Required sections:

- Critical: read `../canvas-shared/SKILL.md` first.
- Core concepts.
- Quick decisions.
- Preferred commands.
- Review workflow notes.
- API/resource mapping.
- Common errors.
- Output interpretation.
- Safety and privacy notes.

### 11.4 `canvas-shared` Content

Must teach agents:

- `canvas auth login` is interactive PAT setup.
- `canvas auth login` automatically runs post-login context bootstrap.
- `canvas auth status` verifies local auth.
- `canvas context show` reads the cached bootstrap context.
- PAT is local and must never be printed.
- Default output is JSON.
- Use `--format pretty` only for human display.
- Use `--page-all` for complete lists.
- Canvas pagination uses `Link` headers.
- Raw API is `canvas api get`.
- MVP has no Canvas writes.
- Sensitive read-only data is explicit, not part of review packs by default.

## 12. Testing Plan

### 12.1 Unit Tests

- URL normalization.
- School registry search.
- Config read/write permissions.
- Token redaction.
- Pagination `Link` header parser.
- Output envelope.
- HTML-to-Markdown conversion.
- Path sanitization.
- Command parser.

### 12.2 Integration Tests

Use mocked Canvas API with `msw` or `undici` mock agent:

- Auth login validation.
- Courses list.
- Modules with inline items.
- Modules with omitted inline items requiring fallback.
- Page export.
- Assignment export.
- File download.
- Discussion view 403 `require_initial_post`.
- Discussion view 503 retry.
- Conversations show with `auto_mark_as_read=false`.
- Review pack complete course.

### 12.3 Manual Tests

Against a real Canvas sandbox or developer account:

- `canvas auth login`.
- `canvas courses list`.
- `canvas review pack` for a small course.
- Locked/unpublished content behavior.
- Large course pagination.
- File download names with unusual characters.

## 13. Milestones

### M0: PRD and Scaffold

- Finalize PRD.
- Create package skeleton.
- Set up TypeScript build/test/lint.
- Create initial skill skeletons and package them.

### M1: Auth and Client

- `canvas auth login`.
- Local config.
- Canvas client.
- Pagination.
- Output envelope.
- `canvas api get`.
- Update `canvas-shared` with auth, token safety, output, pagination, and raw API behavior.

### M2: Core Course Reads

- Courses.
- Tabs.
- Modules.
- Pages.
- Files/folders.
- Assignments.
- Update corresponding skills while each feature lands:
  - `canvas-courses`
  - `canvas-modules`
  - `canvas-pages`
  - `canvas-files`
  - `canvas-assignments`

### M3: Review Pack

- `canvas review pack`.
- HTML-to-Markdown.
- File download.
- Manifest/citations/fetch log.
- Dynamic course setup handling.
- Update `canvas-review` in the same milestone.

### M4: Full Student Read Surface

- Assignment groups.
- Grades.
- Submissions.
- Quizzes.
- Discussions.
- Announcements.
- Calendar/planner/todos.
- Groups.
- Conversations.
- Add/update one skill per command family as those commands ship.

### M5: Skills Installer and Agent Verification

- Confirm all feature skills match implemented commands.
- `canvas skills install`.
- `npx skills add @lukeguo12210/canvas-lms-cli -g -y`.
- Agent verification examples.

### M6: Polish

- Pretty/table output.
- Robust errors.
- Docs.
- npm publish.

## 14. Acceptance Criteria

MVP is acceptable when:

- `npm install -g @lukeguo12210/canvas-lms-cli` installs a working `canvas` command.
- `canvas auth login` supports school picker, browser open, PAT entry, and validation.
- `canvas courses list` returns structured JSON.
- `canvas review pack --course-id <id>` creates a complete agent-readable local pack for a representative course.
- CLI never prints PAT.
- CLI refuses Canvas write methods.
- Pagination works for large lists.
- Files download safely.
- Skills install into at least one supported agent environment.
- An LLM agent can use the installed skills to authenticate, list courses, and create a review pack without extra user-written instructions.

## 15. Open Implementation Questions

These should be resolved during implementation, not block the PRD:

- Confirm npm scoped package publishing and access settings for `@lukeguo12210/canvas-lms-cli`.
- Confirm exact skills registry/package metadata required for `npx skills add @lukeguo12210/canvas-lms-cli -g -y`.
- Confirm best local config path on Windows.
- Confirm whether Canvas conversation `auto_mark_as_read=false` fully prevents read-state mutation across institutions.
- Confirm the most reliable endpoint for "my groups" across Canvas versions; use course-scoped groups with `only_own_groups=true` as the conservative fallback.
- Decide whether `canvas skills install` should be implemented in MVP or only after `npx skills add` support is working.

## 16. Source References

Official Canvas docs checked for this PRD:

- Canvas API overview: https://developerdocs.instructure.com/services/canvas
- Courses: https://developerdocs.instructure.com/services/canvas/file.all_resources/courses
- Modules: https://developerdocs.instructure.com/services/canvas/file.all_resources/modules
- Pages: https://developerdocs.instructure.com/services/canvas/resources/pages
- Files and folders: https://developerdocs.instructure.com/services/canvas/file.all_resources/files
- Assignments: https://developerdocs.instructure.com/services/canvas/resources/assignments
- Assignment groups: https://developerdocs.instructure.com/services/canvas/file.all_resources/assignment_groups
- Submissions: https://developerdocs.instructure.com/services/canvas/resources/submissions
- Quizzes: https://developerdocs.instructure.com/services/canvas/resources/quizzes
- Discussion topics: https://developerdocs.instructure.com/services/canvas/resources/discussion_topics
- Announcements: https://developerdocs.instructure.com/services/canvas/file.all_resources/announcements
- Calendar events: https://developerdocs.instructure.com/services/canvas/resources/calendar_events
- Planner: https://developerdocs.instructure.com/services/canvas/file.all_resources/planner
- Tabs: https://developerdocs.instructure.com/services/canvas/resources/tabs
- Groups: https://developerdocs.instructure.com/services/canvas/resources/groups/
- Conversations: https://developerdocs.instructure.com/services/canvas/file.all_resources/conversations

Design reference:

- Lark CLI: https://github.com/larksuite/cli
