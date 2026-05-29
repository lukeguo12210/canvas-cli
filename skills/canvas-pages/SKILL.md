---
name: canvas-pages
version: 0.1.0
description: "Canvas LMS pages: list course pages, inspect page HTML, and export visible pages for local review workflows."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas pages --help"
---

# canvas-pages

Before using this skill, read `../canvas-shared/SKILL.md`.

## Commands

```bash
canvas pages list --course-id <course-id> --page-all --format json
canvas pages list --course-id <course-id> --search "syllabus" --format json
canvas pages show --course-id <course-id> --page <page-url> --format json
canvas pages export --course-id <course-id> --page <page-url> --out <dir> --format json
```

## Notes

- Canvas page identifiers are usually URL slugs such as `syllabus`, not numeric IDs.
- Page bodies are Canvas HTML. Preserve the original HTML in exports.
- Locked pages should be reported as locked, not treated as fatal when traversing a whole course.
- `CANVAS_NOT_FOUND` from `pages list` often means the course does not expose Canvas Pages. Treat it as "pages unavailable" and continue checking modules, assignments, files, or tabs.
