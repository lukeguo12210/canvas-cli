import "server-only";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { decodeJwt } from "jose";
import { env, pilotEmails } from "./config";
export function admin() {
  return createClient(env("SUPABASE_URL"), env("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
export async function sessionClient() {
  const jar = await cookies();
  return createServerClient(
    env("SUPABASE_URL"),
    env("SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll: (items) => {
          try {
            items.forEach(({ name, value, options }) =>
              jar.set(name, value, {
                ...options,
                httpOnly: true,
                secure: process.env.NODE_ENV === "production",
                sameSite: "lax",
              }),
            );
          } catch {
            /* Server components cannot write cookies; route handlers refresh them. */
          }
        },
      },
    },
  );
}
export async function userSession() {
  const db = await sessionClient();
  const {
    data: { user },
    error,
  } = await db.auth.getUser();
  if (
    error ||
    !user ||
    !user.email_confirmed_at ||
    !pilotEmails().includes(user.email?.toLowerCase() ?? "")
  )
    return null;
  const {
    data: { session },
  } = await db.auth.getSession();
  if (!session) return null;
  const claims = decodeJwt(session.access_token);
  if (
    claims.sub !== user.id ||
    claims.aud !== "authenticated" ||
    claims.client_id ||
    typeof claims.session_id !== "string"
  )
    return null;
  const { data: active, error: sessionError } = await admin().rpc(
    "session_is_active",
    { p_user: user.id, p_session: claims.session_id },
  );
  if (sessionError || !active) return null;
  return { db, user };
}
export async function requireUser() {
  const session = await userSession();
  if (!session) throw Error("UNAUTHORIZED");
  return session;
}
