import { userSession } from "@/lib/supabase";
import { connection } from "@/lib/connections";
import { json } from "@/lib/http";
export async function GET() {
  const session = await userSession();
  return json(
    session
      ? {
          email: session.user.email,
          connection: await connection(session.user.id),
        }
      : { email: null, connection: null },
  );
}
