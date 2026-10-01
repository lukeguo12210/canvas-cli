import { userSession } from "@/lib/supabase";
import Link from "next/link";
import { Consent } from "./ui";
export const dynamic = "force-dynamic";
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ authorization_id?: string }>;
}) {
  const { authorization_id: id } = await searchParams;
  const session = await userSession();
  if (!id)
    return (
      <main className="narrow">
        <h1>This connection link is incomplete.</h1>
        <Link href="/">Go to Canvas Companion</Link>
      </main>
    );
  if (!session)
    return (
      <main className="narrow">
        <h1>Sign in to connect.</h1>
        <p>Use your invited account to continue.</p>
        <Link
          className="button"
          href={`/?returnTo=${encodeURIComponent("/oauth/consent?authorization_id=" + id)}`}
        >
          Sign in
        </Link>
      </main>
    );
  const { data, error } =
    await session.db.auth.oauth.getAuthorizationDetails(id);
  if (error || !data || !("client" in data))
    return (
      <main className="narrow">
        <h1>This connection request has expired.</h1>
        <p>Start the connection again from ChatGPT.</p>
      </main>
    );
  const clients = (process.env.MCP_CLIENT_IDS ?? "").split(",");
  if (!clients.includes(data.client.id))
    return (
      <main className="narrow">
        <h1>This application is not enabled for the private pilot.</h1>
      </main>
    );
  return (
    <main className="narrow">
      <p>Canvas Companion</p>
      <h1>Connect {data.client.name}?</h1>
      <p>
        This grants read access to courses, assignments, modules, pages and file
        metadata in your connected Canvas account. Your access token remains on
        our server.
      </p>
      <p>Signed in as {session.user.email}</p>
      <Consent id={id} />
    </main>
  );
}
