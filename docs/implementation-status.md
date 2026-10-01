# Canvas Companion implementation

October 1, 2026. The user approved implementation and personal cloud deployment, then explicitly selected personal access tokens instead of institution OAuth. This decision supersedes the OAuth-only onboarding in the original research plan. The deployed product is an invitation-only personal pilot, not a public-directory launch.

## Implemented

- Next.js website with email sign-in, school search, 35 catalog entries, custom HTTPS Canvas origins, encrypted access-token connection, connection status, disconnect, global sign-out and account deletion.
- Eight authenticated read-only MCP tools at `/mcp`, built with Vercel's MCP handler and the official MCP server SDK.
- Shared Canvas client with same-resource pagination, explicit redirect handling, bearer isolation, bounded response sizes and timeouts. Hosted requests pin DNS to public addresses and reject private/link-local destinations.
- AES-256-GCM token encryption with random nonces and user/institution binding. Encryption keys are separate per environment and stored in the corresponding personal Vercel project; encrypted rows are stored in Supabase. Vault was evaluated in the plan; this pilot uses application encryption to keep the encryption key outside the database.
- Supabase tables with RLS, zero anonymous/authenticated credential-table grants and no public privileged-function execution. Only the server accesses encrypted records, with a verified user filter.
- OAuth consent UI and exact issuer/audience/client/scope JWT checks, live session ownership/revocation checks and a custom audience hook. The connector's OAuth token is separate from the Canvas PAT.
- Strict server-side invite list (`PILOT_EMAILS`), initially the owner's personal email. No public signup UI. No school password fields.
- Privacy, terms and support pages; source-linked and minimized tool results; HTML converted to plain text.
- Daily authenticated retention cleanup for rate-limit buckets.
- Fail-closed cloud guard, source-only deployment packager, CI checks and a validated plugin package under `plugins/canvas-companion`.

## Hosted endpoints

- Production: https://canvas-companion-luke.vercel.app
- Development: https://canvas-companion-luke-dev.vercel.app
- Production MCP: https://canvas-companion-luke.vercel.app/mcp
- Production discovery: https://canvas-companion-luke.vercel.app/.well-known/oauth-protected-resource/mcp

Both websites have reached Vercel READY. Authentication and authorization are enforced by the app. OAuth activation and real-user qualification remain explicitly pending below.

## Personal cloud resources

| Environment | Vercel project | Supabase reference |
| --- | --- | --- |
| Development | canvas-companion-luke-dev / prj_KgkyB8nILDWhIQNmiAqzuwYFaLGH | bseipkfggqpoyuilowwe |
| Production | canvas-companion-luke / prj_HOQWAAM5OY9gqcFS66ORNvw0b0SS | awajrlthxfpqbkmtwvvq |

Both Vercel projects belong to `team_tRdTZetEMtiIbrCXFDOq8itX` (Luke Guo's projects). Both Supabase projects belong to `picznioxscdeujoelrwv` (Luke's Org). The Supabase organization already has a Pro subscription; project provisioning did not change the organization subscription. Project compute is governed by that existing organization plan, despite the legacy create-project API's `plan: free` input. No work resources, credentials or deployment links were reused.

Exact IDs, routing aliases and prohibited work accounts are recorded in `deployment-targets.json`. Project ownership was read back after creation. Secret provisioning inputs and environment material are stored outside Git in a user-only local directory, with mode 0600 files and a 0700 parent directory. No secrets belong in the plugin ZIP.

## Verification completed

- CLI: 56 tests, TypeScript check and build passed.
- Web: 45 security/protocol tests and TypeScript check passed; production build passed.
- Cloud ownership guard: 2 tests pass, including work-account and unknown-project rejection.
- Live development database: anonymous access, owner access and other-user access to credential rows all denied; privileged RPC denied; server owner filtering, session ownership and global-signout revocation verified. Disposable synthetic identities were removed; no test emails sent.
- SQL permission audits in both databases: RLS enabled, no browser table grants, no public privileged-function grants.
- Dependency audits: no reported vulnerabilities in root or web dependency trees at verification time.
- Browser: desktop and 390px mobile sign-in UI inspected.
- Deployed development and production smoke tests: home/privacy/terms/help/session/discovery return 200; unauthenticated MCP and connection writes return 401; cross-origin connection writes return 403; unauthenticated maintenance returns 401.
- Plugin compatibility manifest and bundled skill passed the installed plugin-creator validators. Public review and native ChatGPT registration are separate, unverified steps.

## Remaining activation dependencies

1. Enable OAuth Server in both personal Supabase projects; keep dynamic registration disabled; set authorization path to `/oauth/consent`.
2. Enable `public.custom_access_token_hook` as the custom access-token hook. Its fixed MCP resource audience is already seeded per environment. Verify actual issued tokens, PKCE, resource behavior and revocation before claiming a functioning ChatGPT connector.
3. Register an OAuth client using the **exact redirect URI displayed by ChatGPT**. Add the returned client ID to that environment's `MCP_CLIENT_IDS`, then redeploy. Never invent a callback, technical plugin ID or a client secret.
4. Connect the user's real Canvas token through the website and complete a real course read. Tests used synthetic records, not private coursework. Catalog support means the form can attempt a school connection; it does not prove every school's token policy or Canvas origin.
5. Sign in with ChatGPT still requires provisioned OpenAI partner access. Email sign-in is the implemented pilot path; actual email delivery and a real user login have not yet been exercised. No fake ChatGPT login is shown.
6. Public distribution requires resolving Canvas's multi-user OAuth policy, third-party connector eligibility and OpenAI submission prerequisites. No public submission or listing has been claimed.

## Development and deployment

```sh
npm ci --ignore-scripts
npm ci --prefix apps/web --ignore-scripts
npm test
npm test --prefix apps/web
npm run dev --prefix apps/web
```

Copy `apps/web/.env.example` to `.env.local` and configure only the personal development project. `TOKEN_ENCRYPTION_KEY` must be 32 random bytes encoded in base64. Do not rotate it without decrypting and re-encrypting existing records. A lost key makes stored Canvas tokens unreadable; users must reconnect.

Every cloud mutation must pass the executable guard:

```sh
node scripts/cloud-guard.mjs preflight
node scripts/prepare-deployment.mjs development /secure/path/deploy-input.json
node scripts/cloud-guard.mjs vercel_create_new_deployment /secure/path/deploy-input.json /secure/path/deploy-result.json
```

The source packager excludes environment files and bundles a snapshot of shared CLI source into the Vercel application directory. It only remaps the `@canvas/*` TypeScript alias; shared source remains authored once under `src/`.

Remote mutations in CI must use the same live preflight and explicit personal Loadout aliases. The provided quality workflow has no cloud credentials or automatic deployment path.

The access-token hook uses a fixed resource audience. Dynamic client registration stays off. Do not weaken the API's exact-audience verification to accept generic `authenticated` tokens if the hook is not active: configure and qualify the hook instead.
