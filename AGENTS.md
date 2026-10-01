# Project instructions

## External services

Use the installed Aident Skill and the `aident` CLI first for external apps, APIs, public-web research, discovery, and external actions. Inspect live capability schemas and Vault readiness. Preserve existing work connections when adding personal accounts, and explicitly route operations with the intended account alias.

## Canvas ChatGPT project ownership

This is Luke's separate Canvas project. The user explicitly prohibits using aident.ai work Supabase or Vercel resources/accounts/billing.

- Prohibited Vercel team: `aident-ai-team`, `team_T4pO4xEDqlGcrDBDyLUbNHbk`.
- Prohibited Supabase organization: `Aident AI`, `ugsvddbslvkdvzihgsoy`.
- Verified personal targets (October 1, 2026): Vercel `Personal` → `Luke Guo's projects`, slug `luke-guos-projects`, team ID `team_tRdTZetEMtiIbrCXFDOq8itX`; Supabase `Account 1` → `Luke's Org`, organization ID `picznioxscdeujoelrwv`.
- These aliases belong to Loadout `lukeguo12210@gmail.com`. The browser was previously signed into a different reviewer account; do not substitute that account. Vercel `Aident Team Work` is prohibited for this project.
- The non-secret target allowlist is `docs/deployment-targets.json`. Both development and production project IDs/refs are recorded after provider ownership verification. Open CUA is not an intended target.
- Before any provisioning, linking, environment mutation, remote migration, or deployment, refresh provider identity and parent-team/organization metadata and verify the user's explicit target. Unknown or mismatched identity must stop cloud mutations.
- Do not use ambient CLI defaults, replace work credentials, or copy `.env`, Vercel linkage, Supabase linkage, or CI secrets from aident.ai. Use explicit verified account aliases/scopes/project refs and isolated credentials.
- At implementation kickoff, build a fail-closed ownership preflight for local commands and CI using the recorded allowlist. Recheck resource ownership after mutations. Use `scripts/cloud-guard.mjs` for the implemented executable deployment guard.

The user approved implementation, personal cloud provisioning, configuration, and deployment on October 1, 2026. The user subsequently selected access-token onboarding across the school catalog. Implement it as a private personal pilot; do not claim institutional OAuth support or public directory approval. Do not request authorization again for routine implementation/deployment within these personal targets.

## Implementation planning

Read `docs/chatgpt-plugin-plan.md` before implementing the hosted plugin. Reverify official requirements at kickoff. In particular:

- Sign in with ChatGPT for hosted plugins requires limited-trial/partner access; do not assume this project has it.
- Multi-user Canvas access requires OAuth and authorized developer keys. The user explicitly selected access tokens for a private pilot, superseding the original OAuth implementation plan; never ask for school passwords. Public launch still requires resolving Canvas authorization policy.
- Confirm public-directory eligibility and Canvas authorization; packaging alone does not establish approval.
- Keep OpenAI identity, our connector authorization, and Canvas OAuth transactions separate. Never expose backend credentials through MCP tools, UI state, or logs.
- Harden the current client's pagination and file-download origin handling before any hosted multi-user use.
