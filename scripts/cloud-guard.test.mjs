import { test } from "node:test";
import assert from "node:assert/strict";
import { validateTarget, targets } from "./cloud-guard.mjs";
test("provision only on personal accounts", () => {
  validateTarget("vercel", "vercel_create_project2", {
    teamId: targets.vercel.teamId,
    name: "canvas-companion-luke",
  });
  validateTarget("supabase", "supabase_create_a_project", {
    organization_id: targets.supabase.organizationId,
    name: "canvas-companion-dev",
    plan: "free",
  });
});
test("deny work, absent and unknown scopes/projects", () => {
  for (const teamId of [undefined, "team_T4pO4xEDqlGcrDBDyLUbNHbk", "unknown"])
    assert.throws(() =>
      validateTarget("vercel", "vercel_create_project2", {
        teamId,
        name: "canvas-companion-luke",
      }),
    );
  assert.throws(() =>
    validateTarget("vercel", "vercel_create_new_deployment", {
      teamId: targets.vercel.teamId,
      project: "unknown",
    }),
  );
  assert.throws(() =>
    validateTarget("supabase", "supabase_create_a_project", {
      organization_id: "ugsvddbslvkdvzihgsoy",
      name: "canvas-companion-dev",
      plan: "free",
    }),
  );
  assert.throws(() =>
    validateTarget("supabase", "supabase_beta_run_sql_query", {
      ref: "unassigned",
    }),
  );
});
