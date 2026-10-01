import { z } from "zod";
import { requireUser } from "@/lib/supabase";
import { sameOrigin, input, json, failure } from "@/lib/http";
import { env } from "@/lib/config";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { id, approve } = z
      .object({ id: z.string().max(200), approve: z.boolean() })
      .parse(await input(request));
    const { db } = await requireUser();
    const { data: details, error: detailError } =
      await db.auth.oauth.getAuthorizationDetails(id);
    if (
      detailError ||
      !details ||
      !("client" in details) ||
      !env("MCP_CLIENT_IDS").split(",").includes(details.client.id)
    )
      throw Error("INVALID_INPUT");
    const { data, error } = await (approve
      ? db.auth.oauth.approveAuthorization(id, { skipBrowserRedirect: true })
      : db.auth.oauth.denyAuthorization(id, { skipBrowserRedirect: true }));
    if (error || !data) throw Error("AUTH_FAILED");
    return json({ redirect: data.redirect_url });
  } catch (e) {
    return failure(e);
  }
}
