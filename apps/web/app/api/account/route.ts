import { admin, requireUser } from "@/lib/supabase";
import { disconnect } from "@/lib/connections";
import { sameOrigin, json, failure } from "@/lib/http";
export async function DELETE(request: Request) {
  try {
    sameOrigin(request);
    const { user, db } = await requireUser();
    const { error: signOutError } = await db.auth.signOut({ scope: "global" });
    if (signOutError) throw signOutError;
    await disconnect(user.id);
    const { error } = await admin().auth.admin.deleteUser(user.id);
    if (error) throw error;
    return json({ ok: true });
  } catch (e) {
    return failure(e);
  }
}
