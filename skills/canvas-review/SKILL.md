---
name: canvas-review
version: 0.1.0
description: "Canvas LMS review packs: create agent-first local course exports that preserve Canvas course/module structure, cite sources, and organize materials for study sessions."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas review --help"
---

# canvas-review

Before using this skill, read `../canvas-shared/SKILL.md`.

## Workflow

Before creating a review pack:

1. Inspect `canvas context show`.
2. Resolve the target course ID.
3. Use `canvas review pack`.

## Commands

```bash
canvas review pack --course-id <course-id> --out <dir>
canvas review pack --course "<course name or code>" --out <dir>
canvas review pack --course-id <course-id> --module <module-id-or-name> --out <dir>
canvas review index --path <pack-dir>
canvas review search --path <pack-dir> --query <query>
```

## Review Pack Rules

- Course is always the top-level unit.
- Preserve Canvas structure first: course, tabs, modules, module items, pages, assignments, files, discussions, announcements, and calendar.
- Use manifests and indexes to make preserved structure easy for agents to parse.
- Default excludes grades, submissions, conversations, and group member lists.
- Record unavailable, locked, external, or skipped resources as warnings.
- Always cite Canvas source URLs in `citations.json`.
