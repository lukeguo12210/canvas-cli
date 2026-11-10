import { sessionClient } from "@/lib/supabase";
import { appOrigin } from "@/lib/config";
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const db = await sessionClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error) {
      const next = url.searchParams.get("next");
      const target =
        next?.startsWith("/oauth/consent?authorization_id=") &&
        !next.includes("//")
          ? next
          : "/";
      return Response.redirect(new URL(target, appOrigin()), 303);
    }
  }
  return Response.redirect(new URL("/?error=login", appOrigin()), 303);
}
