# Read-Only-First Plan

## Principle

`canvas-cli` should be safe for a student to hand to an LLM agent during a review session. The default and MVP behavior is to read Canvas data, download accessible materials, and write only to the local filesystem.

The tool must not mutate Canvas state in v1.

## Why this matters

Canvas contains grades, submissions, discussion posts, messages, calendar events, and course settings. An LLM agent should be able to help a student study without accidentally submitting work, posting content, changing progress state, deleting files, or touching instructor/admin surfaces.

Read-only-first makes the local token workflow safer because the CLI refuses mutating requests even if the personal access token itself has broader Canvas permissions.

## Allowed in v1

Allowed operations:

- List active courses for the authenticated user.
- Show course metadata visible to the user.
- List modules and module items.
- Fetch pages and convert page HTML to local Markdown.
- List assignments and due dates.
- Fetch assignment descriptions and visible attachments.
- List discussion topics and announcements.
- Fetch discussion topic content where the user already has permission.
- List and download visible course files.
- Fetch calendar events and todo items visible to the user.
- Export local study packs under a user-selected directory.
- Search local exported materials.
- Optionally call Canvas Smart Search as a read-only beta feature if available.

Local writes are allowed only for exports, manifests, logs, caches, and indexes under user-controlled directories.

## Data minimization

Read-only does not mean pull everything.

The default student workflow should pull course learning materials, not private student records. Review packs should exclude sensitive personal data unless the user explicitly opts in.

Default review-pack content:

- Course title and public course metadata visible to the student.
- Modules and module items.
- Pages.
- Assignment descriptions, due dates, and visible attachments.
- Announcements and discussion prompts.
- Course files linked from modules, pages, assignments, and visible file listings.
- Calendar/todo dates related to the course.

Excluded by default:

- Grades and scores.
- Submission bodies and submitted files.
- Rubric assessment results.
- Private comments on submissions.
- Inbox/conversation messages.
- Page view history, access reports, analytics, or activity streams.
- User lists or classmates.

Sensitive read-only commands can be added later behind explicit flags such as `--include grades` or separate shortcuts such as `canvas grades +mine`, but they should not be part of `+review-pack`.

## Blocked in v1

Blocked operations:

- `POST`, `PUT`, `PATCH`, and `DELETE` Canvas API calls.
- Submitting assignments.
- Uploading files.
- Posting or replying to discussion topics.
- Marking module items as done/read.
- Sending Canvas conversations/messages.
- Creating calendar events.
- Editing course nicknames, settings, pages, files, modules, or assignments.
- Masquerading with `as_user_id`.
- Admin, teacher, or institution-management workflows.
- Bulk user, enrollment, analytics, access-report, or classmates-list workflows unless a later use case explicitly justifies them.

If a user asks for a blocked action, the CLI and skills should explain that the installed profile is read-only and suggest opening Canvas directly.

## Auth model

The MVP uses Canvas personal access tokens only.

This keeps the first version simple: a student provides their own Canvas base URL and personal access token, then uses the CLI locally to retrieve course materials they can already view.

The CLI should support these auth/profile concepts:

1. `student-readonly` as the default behavior profile.
2. `personal-access-token` as the only MVP credential type.

Important policy note: personal access tokens are appropriate for a user's own local use and for development/testing. The project should not ask third-party users to generate and paste tokens into a hosted service or multi-user app. If the project later needs school-approved multi-user distribution, revisit OAuth then.

PAT setup:

```bash
canvas auth login
canvas auth status
```

Because personal access tokens are the only MVP credential type, `canvas auth login` should start the PAT setup flow directly. A `--type` flag can be added later only if another credential type is introduced.

During login, the CLI should ask for:

- Canvas base URL, for example `https://school.instructure.com`.
- Personal access token, entered via hidden prompt or stdin secret mode.
- Optional profile name, defaulting to `default`.

The CLI should validate the token with a low-risk read-only request such as `GET /api/v1/users/self` or `GET /api/v1/courses`, then store it in OS-native secure storage where possible.

OAuth is out of scope for the MVP.

## CLI safety rules

The CLI should enforce these rules centrally:

- `canvas api` accepts only `GET` unless an explicit future write profile is installed.
- `canvas api` should also apply a denylist for sensitive read-only endpoints, including access reports, analytics, users, enrollments, page views, conversations, and masquerading parameters, unless an explicit command/profile supports them.
- Domain command registration should include `readonly: true`.
- Domain commands should also include `sensitivity: material | private | admin`.
- Commands with side effects should not compile into the v1 binary, or should be hidden behind build tags until a later phase.
- `--dry-run` should show the request method, path, query params, and local output path without printing tokens.
- Auth commands should never print or echo personal access tokens.
- Logs and error reports should redact `Authorization`, `access_token`, query-string tokens, and copied Canvas URLs that include verifier-like secrets.
- `--as-user-id`, `as_user_id`, or masquerading parameters are rejected by default.
- File downloads should normalize paths and prevent path traversal.
- HTML-to-Markdown conversion should preserve source URLs and strip active content.
- Export manifests should record source API URL, Canvas HTML URL, fetched time, content type, and local path.

## MVP command surface

Shortcuts:

```bash
canvas auth login
canvas auth status
canvas courses +list
canvas course +overview --course-id 123
canvas course +sync --course-id 123 --out ./canvas/CS101
canvas course +review-pack --course-id 123 --out ./review/CS101-midterm
canvas course +search-local --path ./review/CS101-midterm --query "dynamic programming"
```

Domain commands:

```bash
canvas courses list
canvas courses get --course-id 123
canvas modules list --course-id 123 --include items,content_details
canvas modules items --course-id 123 --module-id 456
canvas pages list --course-id 123
canvas pages get --course-id 123 --page intro-to-proofs
canvas assignments list --course-id 123
canvas assignments get --course-id 123 --assignment-id 789
canvas discussions list --course-id 123
canvas files list --course-id 123
canvas files download --file-id 555 --out ./files
canvas calendar list --context course_123
canvas todo list --course-id 123
```

Sensitive read-only commands should be postponed until after the material workflow is solid:

```bash
canvas grades mine --course-id 123
canvas submissions mine --course-id 123 --assignment-id 789
```

Raw read-only API:

```bash
canvas api GET /api/v1/courses
canvas api GET /api/v1/courses/123/modules --params '{"include":["items","content_details"]}'
```

Any non-GET call should fail with a clear read-only error.

## Agent skills

Initial MVP skills:

- `canvas-shared`: auth, token safety, read-only policy, pagination, output handling.
- `canvas-courses`: course discovery and course identity disambiguation.
- `canvas-modules`: module and module-item traversal.
- `canvas-files`: file metadata and download workflows.
- `canvas-assignments`: due dates, assignment descriptions, visible attachments.
- `canvas-review`: review-pack workflow for study sessions.

These MVP skills should document the current read-only behavior, but the skill system should not be permanently limited to read-only use cases. Future write-capable skills can be added when the CLI supports safe write commands.

Future skill examples:

- `canvas-submissions`: submit assignments, list submission history, download submitted files.
- `canvas-discussions`: post and reply to discussion topics.
- `canvas-calendar`: create or update study events.
- `canvas-instructor`: instructor/admin workflows if the project later supports them.

Write-capable skills should be separate from the initial study/review skills so agents can load the right operating manual for the task.

## Skill design

Canvas skills should follow the same high-signal structure as `larksuite/cli` skills. The skill files are not generic documentation; they are agent operating manuals.

Recommended structure for every `SKILL.md`:

```yaml
---
name: canvas-modules
version: 1.0.0
description: "Canvas LMS modules: list course modules, traverse module items, resolve pages/files/assignments/discussions for study workflows."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas modules --help"
---
```

Then include these sections:

- Critical shared rule: read `../canvas-shared/SKILL.md` first for auth, token handling, pagination, output formats, and current safety mode.
- Core concepts: Canvas resource IDs, course IDs, module item types, API URLs versus Canvas HTML URLs, file download URLs, local export paths.
- Quick decisions: when to use shortcuts versus domain commands versus raw `canvas api`.
- Shortcuts: preferred `canvas <domain> +<verb>` commands with examples.
- API resources: canonical Canvas endpoints mapped to CLI commands.
- Common errors: unauthorized, unpublished content, missing file URLs, paginated partial results, locked modules, restricted files.
- Output expectations: how to summarize JSON results for a student, how to cite Canvas source URLs, and how to write local manifests.
- Permission and safety notes: what the current skill can and cannot do, tied to the installed CLI behavior.

The pattern should mirror Lark's strengths:

- Put shared auth and safety rules in one `canvas-shared` skill.
- Keep domain skills narrow and operational.
- Prefer shortcuts for common workflows.
- Keep raw API access as an escape hatch.
- Add reference files under `references/` for complex shortcut behavior.
- Include examples that are copy-pastable by an agent.
- Teach resource semantics, not just command syntax.

## Review-pack workflow

`canvas course +review-pack` should:

1. Resolve the course by ID or search term.
2. Fetch modules with item details.
3. Fall back to per-module item listing when Canvas omits inline items.
4. Resolve pages, files, assignments, discussions, and external links.
5. Download visible files.
6. Convert Canvas HTML content to local Markdown.
7. Exclude grades, submissions, private comments, user lists, and activity history.
8. Build `index.md`, `manifest.json`, and `citations.json`.
9. Keep every local artifact traceable back to a Canvas API URL or Canvas HTML URL.

Suggested output:

```text
review-pack/
  index.md
  manifest.json
  citations.json
  modules/
  pages/
  assignments/
  discussions/
  files/
```

## Future write support

Write support is not part of the MVP, but the architecture should expect it.

When added later, write support should have explicit commands and dedicated skills, for example `canvas-submissions`, `canvas-discussions`, or `canvas-instructor`, with:

- Separate install step.
- Separate credentials or future OAuth scopes.
- Command-level confirmation.
- `--dry-run` previews.
- Audit log.
- Explicit role checks.
- No automatic invocation by LLMs.

The initial student review bundle should remain read-only until those write workflows are designed and implemented deliberately.
