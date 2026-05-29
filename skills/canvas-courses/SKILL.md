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

- If the user names a course ambiguously, use `canvas courses search <query>`.
- Once a course ID is known, prefer the ID.
- After login, inspect `canvas context show` before listing courses again.
- Use tabs to understand whether the course is module-heavy, assignment-heavy, file-heavy, or page-heavy.
- For "pull this class" or "help me study", switch to `canvas-review`.

## Commands

```bash
canvas courses list
canvas courses search <query>
canvas courses show <course-id>
canvas courses overview <course-id>
canvas tabs list --course-id <course-id>
```

## Output Notes

Course names can be school-specific, abbreviated, or nicknamed. Preserve Canvas IDs and source URLs in summaries.
