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
canvas files list --course-id <course-id>
canvas files show <file-id>
canvas files download <file-id> --out <dir>
canvas files download-linked --course-id <course-id> --out <dir>
canvas folders list --course-id <course-id>
canvas folders path --course-id <course-id> --path <path>
```

## Rules

- Prefer linked files for review packs.
- Use all-files export only when the user explicitly asks.
- Preserve Canvas display names in metadata.
- Record source API URL and source HTML URL in manifests.
- Never write downloaded files outside the requested output directory.
