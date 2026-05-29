---
name: canvas-files
version: 0.1.0
description: "Canvas LMS files: list course files and folders, inspect file metadata, download accessible files safely, and resolve files linked from modules, pages, and assignments."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas files --help"
---

# canvas-files

Before using this skill, read `../canvas-shared/SKILL.md`.

## Commands

```bash
canvas files list --course-id <course-id> --page-all --format json
canvas files list --folder-id <folder-id> --page-all --format json
canvas files list --group-id <group-id> --page-all --format json
canvas files show <file-id> --format json
canvas files download <file-id> --out <dir> --format json
canvas files download-linked --course-id <course-id> --out <dir> --format json
canvas folders list --course-id <course-id> --page-all --format json
canvas folders path --course-id <course-id> --path <path> --format json
```

## Rules

- Prefer linked files for review packs.
- Use all-files export only when the user explicitly asks.
- Preserve Canvas display names in metadata.
- Record source API URL and source HTML URL in manifests.
- Never write downloaded files outside the requested output directory.

## Current Behavior

- `files list` returns metadata only; it does not download bytes.
- `files download` writes one file to the requested output directory.
- `files download-linked` currently downloads file IDs discoverable from module file items and assignment attachments when Canvas exposes them.
- Folder commands are separate top-level commands: use `canvas folders ...`, not `canvas files folders ...`.
- Do not skip file checks just because pages or modules are unavailable. Run `canvas files list` as its own command.
