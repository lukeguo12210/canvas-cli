import { timingSafeEqual } from "node:crypto";
import { admin } from "@/lib/supabase";
import { env } from "@/lib/config";
import { json } from "@/lib/http";
export async function GET(request: Request) {
  const expected = Buffer.from(`Bearer ${env("CRON_SECRET")}`);
  const provided = Buffer.from(request.headers.get("authorization") ?? "");
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  )
    return json({ error: "Unauthorized" }, 401);
  const { error } = await admin()
    .from("request_buckets")
    .delete()
    .lt("window_start", new Date(Date.now() - 86400000).toISOString());
  return json({ ok: !error }, error ? 503 : 200);
}
