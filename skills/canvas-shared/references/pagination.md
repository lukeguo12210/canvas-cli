# Canvas Pagination Reference

Canvas list endpoints can be paginated.

Use:

```bash
canvas courses list --active --page-all --format json
```

General flags:

```bash
--page-all
--page-limit <n>
--page-size <n>
--page-delay <ms>
```

Important rule:

Canvas pagination follows HTTP `Link` headers. Do not synthesize next-page URLs manually.

When completeness matters, use `--page-all`. For quick exploratory commands, one page may be enough.
