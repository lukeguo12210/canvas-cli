import { createRequire } from "node:module";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";
import { verifyIdentity, verifyProject, targets } from "./cloud-guard.mjs";
const require = createRequire(
  new URL("../apps/web/package.json", import.meta.url),
);
const { createClient } = require("@supabase/supabase-js");
const env = JSON.parse(readFileSync(process.argv[2], "utf8"));
const ref = new URL(env.SUPABASE_URL).hostname.split(".")[0];
assert.equal(
  ref,
  targets.supabase.projects.development.ref,
  "Only the allowlisted development database may receive test fixtures",
);
verifyIdentity();
verifyProject("supabase", ref);
const admin = createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const created = [];
try {
  const users = [];
  for (let i = 0; i < 2; i++) {
    const email = `canvas-qualification-${randomUUID()}@example.invalid`;
    const password = randomBytes(32).toString("hex");
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    assert.ifError(error);
    created.push(data.user.id);
    const db = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signed = await db.auth.signInWithPassword({ email, password });
    assert.ifError(signed.error);
    users.push({
      db,
      id: data.user.id,
      token: signed.data.session.access_token,
    });
  }
  const inserted = await admin
    .from("canvas_connections")
    .insert({
      user_id: users[0].id,
      school_id: "test",
      school_name: "Disposable security fixture",
      canvas_origin: "https://example.invalid",
      canvas_user_id: "test",
      canvas_display_name: "Test",
      encrypted_token: "synthetic-ciphertext-not-a-real-token",
    });
  assert.ifError(inserted.error);
  for (const { db } of users) {
    const read = await db.from("canvas_connections").select("*");
    assert.ok(read.error, "Authenticated users must not read token rows");
    const rpc = await db.rpc("take_request", {
      p_bucket: "forbidden",
      p_limit: 99999,
    });
    assert.ok(rpc.error, "User must not invoke privileged functions");
  }
  const anon = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY);
  assert.ok((await anon.from("canvas_connections").select("*")).error);
  const owner = await admin
    .from("canvas_connections")
    .select("user_id")
    .eq("user_id", users[0].id);
  assert.equal(owner.data.length, 1);
  const other = await admin
    .from("canvas_connections")
    .select("user_id")
    .eq("user_id", users[1].id);
  assert.equal(other.data.length, 0);
  const payload = JSON.parse(
    Buffer.from(users[0].token.split(".")[1], "base64url"),
  );
  const before = await admin.rpc("session_is_active", {
    p_user: users[0].id,
    p_session: payload.session_id,
  });
  assert.ifError(before.error);
  assert.equal(before.data, true);
  const wrongOwner = await admin.rpc("session_is_active", {
    p_user: users[1].id,
    p_session: payload.session_id,
  });
  assert.equal(wrongOwner.data, false);
  const out = await users[0].db.auth.signOut({ scope: "global" });
  assert.ifError(out.error);
  const after = await admin.rpc("session_is_active", {
    p_user: users[0].id,
    p_session: payload.session_id,
  });
  assert.equal(after.data, false);
  console.log(
    "Live development database: anonymous/owner/other-user credential access denied; privileged RPC denied; owner filtering, session ownership and revocation verified.",
  );
} finally {
  for (const id of created) {
    const { error } = await admin.auth.admin.deleteUser(id);
    assert.ifError(error);
  }
  console.log(
    "Disposable test identities and connection rows removed. No email sent.",
  );
}
