import { requireUser } from "@/lib/supabase";
import { sameOrigin, json, failure } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { db } = await requireUser();
    const { error } = await db.auth.signOut({ scope: "global" });
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
