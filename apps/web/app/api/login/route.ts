import { z } from "zod";
import { sessionClient } from "@/lib/supabase";
import { appOrigin, pilotEmails } from "@/lib/config";
import { rateLimit } from "@/lib/connections";
import { sameOrigin, input, json, failure } from "@/lib/http";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const { email, returnTo } = z
      .object({
        email: z.email().max(254),
        returnTo: z.string().max(300).optional(),
      })
      .parse(await input(request));
    if (!pilotEmails().includes(email.toLowerCase()))
      return json(
        {
          message: "This private pilot is available to invited accounts only.",
        },
        403,
      );
    await rateLimit(`login:${email.toLowerCase()}`, 2);
    const redirect = new URL("/auth/callback", appOrigin());
    if (
      returnTo?.startsWith("/oauth/consent?authorization_id=") &&
      !returnTo.includes("//")
    )
      redirect.searchParams.set("next", returnTo);
    const db = await sessionClient();
    const { error } = await db.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirect.href, shouldCreateUser: true },
    });
    if (error)
      return json(
        {
          error: "Could not send the sign-in email. Please wait and try again.",
        },
        429,
      );
    return json({
      message: "Check your email for a sign-in link. Open it in this browser.",
    });
  } catch (e) {
    return failure(e);
  }
}
