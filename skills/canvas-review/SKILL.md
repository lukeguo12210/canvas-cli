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

1. Inspect `canvas courses overview <course-id>`.
2. Resolve the target course ID.
3. Use `canvas review pack`.

## Commands

```bash
canvas review pack --course-id <course-id> --out <dir>
canvas review pack --course-id <course-id> --out <dir> --include-all-files
```

## Review Pack Rules

- Course is always the top-level unit.
- Preserve Canvas structure first: course, tabs, modules, module items, pages, assignments, files, discussions, announcements, and calendar.
- Use manifests and indexes to make preserved structure easy for agents to parse.
- Default excludes grades, submissions, conversations, and group member lists.
- Record unavailable, locked, external, or skipped resources as warnings.
- Always cite Canvas source URLs in `citations.json`.

## Current Behavior

The current pack command writes JSON files:

- `manifest.json`
- `course.json`
- `modules.json`
- `assignments.json`
- `pages.json`

It includes visible course metadata, tabs, modules, assignments, and pages. With `--include-all-files`, it also includes visible file metadata. It does not yet write `citations.json`, build a search index, or download all file bytes.
