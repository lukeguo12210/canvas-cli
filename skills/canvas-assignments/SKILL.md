---
name: canvas-assignments
version: 0.1.0
description: "Canvas LMS assignments: list assignments, inspect assignment details, due dates, submission types, descriptions, visible attachments, and assignment groups."
metadata:
  requires:
    bins: ["canvas"]
  cliHelp: "canvas assignments --help"
---

# canvas-assignments

Before using this skill, read `../canvas-shared/SKILL.md`.

## Commands

```bash
canvas assignments list --course-id <course-id>
canvas assignments list --course-id <course-id> --bucket upcoming
canvas assignments show --course-id <course-id> --assignment-id <assignment-id>
canvas assignments export --course-id <course-id> --assignment-id <assignment-id> --out <dir>
canvas assignment-groups list --course-id <course-id>
```

## Notes

- Canvas assignment descriptions are HTML; export them as Markdown when writing local files.
- Due dates may be overridden per student; use Canvas-returned dates as authoritative.
- Submission data is sensitive and should not be part of default review workflows.
- External tools should be linked, not scraped.
