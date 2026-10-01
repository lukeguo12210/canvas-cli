import "server-only";
import { CanvasClient } from "@canvas/core/canvas-client";
import { admin } from "./supabase";
import { env } from "./config";
import { seal, unseal } from "./crypto";
import { safeFetch } from "./safe-fetch";
import { School } from "./schools";
export async function rateLimit(owner: string, limit = 60) {
  const { data, error } = await admin().rpc("take_request", {
    p_bucket: owner,
    p_limit: limit,
  });
  if (error) throw Error("STORE_UNAVAILABLE");
  if (!data) throw Error("RATE_LIMITED");
}
export async function connection(owner: string) {
  const { data, error } = await admin()
    .from("canvas_connections")
    .select(
      "school_id,school_name,canvas_origin,canvas_user_id,canvas_display_name,updated_at",
    )
    .eq("user_id", owner)
    .maybeSingle();
  if (error) throw Error("STORE_UNAVAILABLE");
  return data;
}
export async function connect(owner: string, school: School, token: string) {
  await rateLimit(`connect:${owner}`, 6);
  const client = new CanvasClient({
    baseUrl: school.url,
    token,
    fetchImpl: safeFetch,
  });
  const { data: me } = await client.get<{ id: string; name: string }>(
    "/api/v1/users/self",
  );
  if (!me.id || !me.name) throw Error("INVALID_CANVAS_RESPONSE");
  const { error } = await admin()
    .from("canvas_connections")
    .upsert({
      user_id: owner,
      school_id: school.id,
      school_name: school.name,
      canvas_origin: school.url,
      canvas_user_id: String(me.id),
      canvas_display_name: me.name.slice(0, 160),
      encrypted_token: seal(
        token,
        owner,
        school.url,
        env("TOKEN_ENCRYPTION_KEY"),
      ),
      updated_at: new Date().toISOString(),
    });
  if (error) throw Error("STORE_UNAVAILABLE");
  return { name: me.name, school: school.name };
}
export async function canvasFor(owner: string) {
  await rateLimit(`canvas:${owner}`);
  const { data, error } = await admin()
    .from("canvas_connections")
    .select("canvas_origin,encrypted_token")
    .eq("user_id", owner)
    .maybeSingle();
  if (error) throw Error("STORE_UNAVAILABLE");
  if (!data) throw Error("CANVAS_NOT_CONNECTED");
  const token = unseal(
    data.encrypted_token,
    owner,
    data.canvas_origin,
    env("TOKEN_ENCRYPTION_KEY"),
  );
  return {
    client: new CanvasClient({
      baseUrl: data.canvas_origin,
      token,
      fetchImpl: safeFetch,
      maxResponseBytes: 2 * 1024 * 1024,
      timeoutMs: 12000,
    }),
    origin: data.canvas_origin,
  };
}
export async function disconnect(owner: string) {
  const { error } = await admin()
    .from("canvas_connections")
    .delete()
    .eq("user_id", owner);
  if (error) throw Error("STORE_UNAVAILABLE");
}
