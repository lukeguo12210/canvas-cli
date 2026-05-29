# Canvas Auth Reference

Implemented auth commands:

```bash
canvas auth login
canvas auth status --format json
canvas auth logout
canvas config show --format json
canvas me --format json
```

If `canvas` is not on `PATH`, use the npm exec fallback:

```bash
npm exec --yes --package @lukeguo12210/canvas-cli -- canvas auth status --format json
npm exec --yes --package @lukeguo12210/canvas-cli -- canvas auth login
```

Do not attempt `sudo npm install -g` from inside an agent session. Prefer the fallback above or ask the user to fix their npm global prefix.

## Login Flow

`canvas auth login` is interactive.

Expected flow:

1. User searches for a school.
2. If exactly one school matches, confirm:

```text
Is this your school: Columbia University (CourseWorks) (https://courseworks2.columbia.edu)? Choose: y/n
```

3. If user chooses `y`, continue with that school.
4. If user chooses `n`, ask for custom school name and Canvas base URL.
5. Print Canvas PAT creation instructions.
6. Open `<baseUrl>/profile/settings` in the browser.
7. Prompt for PAT using hidden input.
8. Validate token.
9. Store local config.

## Token Safety

Never ask the user to paste a token into chat. The token should be pasted into the local terminal prompt from `canvas auth login`.

Never print:

- PAT values
- `Authorization` headers
- bearer tokens
- query params named `token`, `access_token`, `api_key`, `verifier`, or `code`

## Auth Status

Use:

```bash
canvas auth status --format json
```

If `authenticated` is `false`, ask the user to run:

```bash
canvas auth login
```

## Current User

Use:

```bash
canvas me --format json
```

This calls Canvas `GET /api/v1/users/self/profile`.
