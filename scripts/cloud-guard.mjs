import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export const targets = JSON.parse(
  readFileSync(
    new URL("../docs/deployment-targets.json", import.meta.url),
    "utf8",
  ),
);
const actions = {
  supabase_create_a_project: "supabase",
  supabase_beta_run_sql_query: "supabase",
  supabase_update_project_auth_config: "supabase",
  supabase_get_project_api_keys: "supabase",
  supabase_get_project: "supabase",
  vercel_create_project2: "vercel",
  vercel_create_new_deployment: "vercel",
  vercel_add_environment_variable: "vercel",
};
export function validateTarget(provider, action, input, manifest = targets) {
  if (provider === "vercel") {
    const t = manifest.vercel;
    if (
      t.teamId !== "team_tRdTZetEMtiIbrCXFDOq8itX" ||
      input.teamId !== t.teamId ||
      t.prohibitedTeamIds.includes(input.teamId)
    )
      throw Error("Vercel team is not the approved personal team");
    if (input.slug && input.slug !== t.teamSlug)
      throw Error("Unexpected Vercel team slug");
    if (action === "vercel_create_project2") {
      if (
        !["canvas-companion-luke", "canvas-companion-luke-dev"].includes(
          input.name,
        )
      )
        throw Error("Unexpected new project name");
    } else if (!t.projectIds.includes(input.idOrName ?? input.project))
      throw Error("Vercel project is not allowlisted");
  } else if (provider === "supabase") {
    const t = manifest.supabase;
    if (
      t.organizationId !== "picznioxscdeujoelrwv" ||
      t.prohibitedOrganizationIds.includes(t.organizationId)
    )
      throw Error("Invalid Supabase organization");
    if (action === "supabase_create_a_project") {
      if (
        input.organization_id !== t.organizationId ||
        !["canvas-companion-dev", "canvas-companion-prod"].includes(
          input.name,
        ) ||
        input.plan !== "free"
      )
        throw Error("Supabase provisioning target or plan is not approved");
    } else if (!t.projectRefs.includes(input.ref))
      throw Error("Supabase project is not allowlisted");
  } else throw Error("Unknown provider");
}
export function execute(name, accountAlias, input) {
  // stdin avoids placing secrets in process arguments, shell expansion, or command logs.
  const raw = execFileSync(
    "aident",
    [
      "capabilities",
      "execute",
      "--name",
      name,
      "--accountAlias",
      accountAlias,
      "--input-file",
      "/dev/stdin",
      "--json",
    ],
    {
      input: JSON.stringify(input),
      encoding: "utf8",
      maxBuffer: 30 * 1024 * 1024,
      stdio: ["pipe", "pipe", "pipe"],
    },
  );
  const result = JSON.parse(raw);
  if (
    !result.success ||
    result.data?.output?.successful === false ||
    result.data?.output?.error
  )
    throw Error(
      "Loadout action failed: " +
        name +
        " (response withheld to protect secrets)",
    );
  return result;
}
export function data(result) {
  return result.data.output.data;
}
export function verifyIdentity() {
  const who = JSON.parse(
    execFileSync("aident", ["whoami", "--json"], { encoding: "utf8" }),
  );
  if (!who.success || who.data.email !== targets.loadoutAccountEmail)
    throw Error("Unexpected Loadout identity");
  const teams = data(
    execute(
      "composio:vercel_tools:vercel_get_teams",
      targets.vercel.accountAlias,
      { limit: 100 },
    ),
  );
  if (
    !teams.teams.some((t) => t.id === targets.vercel.teamId) ||
    teams.pagination.next
  )
    throw Error("Personal Vercel team not conclusively verified");
  const orgs = data(
    execute(
      "composio:supabase_tools:supabase_list_all_organizations",
      targets.supabase.accountAlias,
      {},
    ),
  );
  if (
    !(orgs.details ?? orgs).some(
      (o) => o.id === targets.supabase.organizationId,
    )
  )
    throw Error("Personal Supabase organization not verified");
}
export function verifyProject(provider, id) {
  if (provider === "supabase") {
    const p = data(
      execute(
        "composio:supabase_tools:supabase_get_project",
        targets.supabase.accountAlias,
        { ref: id },
      ),
    );
    const item = p.project ?? p;
    if (
      (item.organization_id ?? item.organization_slug) !==
        targets.supabase.organizationId ||
      (item.id ?? item.ref) !== id
    )
      throw Error("Supabase project ownership mismatch");
    return item;
  }
  const p = data(
    execute(
      "composio:vercel_tools:vercel_get_projects",
      targets.vercel.accountAlias,
      { teamId: targets.vercel.teamId, limit: "100" },
    ),
  );
  const item = p.projects?.find((p) => p.id === id);
  if (!item || item.accountId !== targets.vercel.teamId)
    throw Error("Vercel project ownership mismatch");
  return item;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv[2] === "preflight") {
      verifyIdentity();
      for (const id of targets.vercel.projectIds) verifyProject("vercel", id);
      for (const id of targets.supabase.projectRefs)
        verifyProject("supabase", id);
      console.log("Personal cloud identity and ownership verified.");
    } else {
      const [action, inputPath, outputPath] = process.argv.slice(2);
      const provider = actions[action];
      if (!provider || !inputPath || !outputPath)
        throw Error("Usage: cloud-guard.mjs action input.json output.json");
      const input = JSON.parse(readFileSync(inputPath, "utf8"));
      validateTarget(provider, action, input);
      verifyIdentity();
      if (
        !["supabase_create_a_project", "vercel_create_project2"].includes(
          action,
        )
      )
        verifyProject(provider, input.ref ?? input.idOrName ?? input.project);
      const result = execute(
        `composio:${provider}_tools:${action}`,
        targets[provider].accountAlias,
        input,
      );
      writeFileSync(outputPath, JSON.stringify(result), { mode: 0o600 });
      if (action === "supabase_create_a_project")
        verifyProject(provider, data(result).id ?? data(result).ref);
      else if (action === "vercel_create_project2")
        verifyProject(provider, data(result).id);
      else
        verifyProject(provider, input.ref ?? input.idOrName ?? input.project);
      console.log("Action completed; protected result saved.");
    }
  } catch {
    console.error(
      "Cloud operation stopped. Identity, ownership, input, or provider verification failed; no alternate account was used.",
    );
    process.exitCode = 1;
  }
}
