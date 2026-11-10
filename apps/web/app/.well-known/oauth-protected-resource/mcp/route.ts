import { env, resource } from "@/lib/config";
export async function GET() {
  return Response.json(
    {
      resource: resource(),
      authorization_servers: [`${env("SUPABASE_URL")}/auth/v1`],
      scopes_supported: ["openid"],
      bearer_methods_supported: ["header"],
      resource_name: "Canvas Companion",
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=300",
      },
    },
  );
}
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
