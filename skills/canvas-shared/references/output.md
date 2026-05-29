# Canvas Output Reference

Default output is JSON.

All command results should use this shape:

```json
{
  "ok": true,
  "data": {},
  "meta": {
    "request": {
      "method": "GET",
      "path": "/api/v1/courses"
    }
  }
}
```

Errors use:

```json
{
  "ok": false,
  "error": {
    "code": "NO_AUTH_CONFIG",
    "message": "No Canvas auth config found. Run canvas auth login.",
    "retryable": false
  }
}
```

## Formats

```bash
--format json      # default, best for agents
--format pretty    # compact human display
--format table     # simple list display
--format ndjson    # batch/streaming workflows
```

Use JSON for reasoning and tool chaining. Use pretty only when the user wants a readable summary.

## Redaction

The CLI redacts token-like values from output. Agents must still avoid asking users to paste tokens into chat.
