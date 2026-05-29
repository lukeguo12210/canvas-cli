---
name: canvas-modules
version: 0.1.0
description: "Canvas LMS modules: list modules, traverse module items, and resolve Canvas pages, files, assignments, quizzes, discussions, and external URLs in course order."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas modules --help"
---

# canvas-modules

Before using this skill, read `../canvas-shared/SKILL.md`.

## Core Concepts

Modules are often the canonical student learning path. Preserve module order and item order.

Common module item types:

- `Page`
- `File`
- `Assignment`
- `Quiz`
- `Discussion`
- `ExternalUrl`
- `ExternalTool`
- `SubHeader`

## Commands

```bash
canvas modules list --course-id <course-id> --page-all --format json
canvas modules list --course-id <course-id> --include items,content_details --page-all --format json
canvas modules items --course-id <course-id> --module-id <module-id> --page-all --format json
canvas modules item --course-id <course-id> --module-id <module-id> --item-id <item-id> --format json
canvas modules export --course-id <course-id> --module-id <module-id> --out <dir> --format json
```

## Notes

Canvas may omit inline module items. If that happens, call `canvas modules items` per module. Locked items should be recorded as locked, not treated as fatal.
