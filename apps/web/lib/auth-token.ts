import "server-only";
import { createRemoteJWKSet } from "jose";
import { admin } from "./supabase";
import { env, pilotEmails, resource } from "./config";
import { verifyTokenClaims } from "./token-validation";
let jwks: ReturnType<typeof createRemoteJWKSet> | undefined;
export async function verifyMcpToken(token: string) {
  const issuer = `${env("SUPABASE_URL")}/auth/v1`;
  jwks ??= createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`));
  const clients = env("MCP_CLIENT_IDS")
    .split(",")
    .map((x) => x.trim());
  const payload = await verifyTokenClaims(
    token,
    jwks,
    issuer,
    resource(),
    clients,
  );
  const db = admin();
  const [
    { data: userData, error: userError },
    { data: active, error: sessionError },
  ] = await Promise.all([
    db.auth.admin.getUserById(payload.userId),
    db.rpc("session_is_active", {
      p_user: payload.userId,
      p_session: payload.sessionId,
    }),
  ]);
  if (
    userError ||
    sessionError ||
    !active ||
    !userData.user?.email_confirmed_at ||
    !pilotEmails().includes(userData.user.email?.toLowerCase() ?? "")
  )
    throw Error("UNAUTHORIZED");
  return { userId: payload.userId, clientId: payload.clientId };
}
