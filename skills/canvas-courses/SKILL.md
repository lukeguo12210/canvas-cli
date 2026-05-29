---
name: canvas-courses
version: 0.1.0
description: "Canvas LMS courses: list active courses, disambiguate course names, inspect course overview, tabs, and top-level student-visible course structure."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas courses --help"
---

# canvas-courses

Before using this skill, read `../canvas-shared/SKILL.md`.

## Quick Decisions

- If auth state is uncertain, start with `canvas auth status --format json`.
- If the user names a course ambiguously, use `canvas courses search <query>`.
- Once a course ID is known, prefer the ID.
- `canvas context show` is planned but not implemented yet. Until it exists, use `canvas courses list --active --page-all`.
- Use tabs to understand whether the course is module-heavy, assignment-heavy, file-heavy, or page-heavy.
- For "pull this class" or "help me study", switch to `canvas-review` and use `canvas review pack`.
- For "what am I learning", inspect `courses overview`, then independently probe visible/likely surfaces such as modules, assignments, pages, and files. Continue if one optional surface returns `CANVAS_NOT_FOUND`.

## Commands

```bash
canvas courses list --active --page-all --format json
canvas courses search <query>
canvas courses show <course-id>
canvas courses overview <course-id>
canvas tabs list --course-id <course-id>
```

### List Active Courses

Use this to discover what courses the student can currently access:

```bash
canvas courses list --active --page-all --format json
```

Important output fields:

- `id`: stable course ID; use this for later commands.
- `name`: Canvas course name.
- `courseCode`: school/course code when Canvas exposes it.
- `workflowState`: availability state.
- `term.name`, `term.startAt`, `term.endAt`: useful for semester context when present.

### Search Courses

Use search when the user gives a name, nickname, department code, or partial course title:

```bash
canvas courses search "algorithms" --format json
```

If multiple courses match, show the user the course names and IDs and ask which one they mean.

### Show One Course

```bash
canvas courses show <course-id> --format json
```

Use this after a course is selected and before deeper course traversal.

### Course Overview

```bash
canvas courses overview <course-id> --format json
```

This fetches course metadata, tabs, module summary, and upcoming assignment summary. Use it to understand how the course is organized.

Overview output includes:

- `course`
- `tabs`
- `setup.hasModules`
- `setup.hasFilesTab`
- `setup.hasAssignments`
- `setup.isModuleHeavy`
- `counts.modules`
- `counts.upcomingAssignments`
- `modules`
- `upcomingAssignments`

### Tabs

```bash
canvas tabs list --course-id <course-id> --format json
```

Tabs help agents infer course structure:

- `modules`: likely module-first course.
- `assignments`: assignment-heavy course.
- `files`: course exposes a file library.
- `pages` or `wiki`: course may use pages outside modules.
- external tool tabs should be linked but not scraped.

Do not run optional probes as one `&&` chain. Prefer separate calls:

```bash
canvas pages list --course-id <course-id> --format json
canvas files list --course-id <course-id> --format json
canvas assignments list --course-id <course-id> --page-all --format json
```

If one returns `CANVAS_NOT_FOUND`, say that surface is unavailable and continue with the others.

## Output Notes

Course names can be school-specific, abbreviated, or nicknamed. Preserve Canvas IDs in summaries.

When answering a user, prefer a compact list:

```text
1. COMS 3134 Algorithms — course id 12345
2. COMS 3157 Advanced Programming — course id 67890
```

Do not invent term dates. If Canvas does not return term dates, say they are unavailable.

## Common Errors

- `NO_AUTH_CONFIG`: ask the user to run `canvas auth login`.
- `CANVAS_NETWORK_ERROR`: network or sandbox cannot reach Canvas.
- `CANVAS_UNAUTHORIZED`: token invalid or expired.
- `CANVAS_FORBIDDEN`: course exists but is not visible to this user.
