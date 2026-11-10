import type {
  ServerContext,
  CallToolResult,
} from "@modelcontextprotocol/server";
import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { verifyMcpToken } from "@/lib/auth-token";
import { canvasFor } from "@/lib/connections";
import { tools, runTool } from "@/lib/tools";
import { resource } from "@/lib/config";
export const runtime = "nodejs";
export const maxDuration = 30;
const handler = createMcpHandler((server) => {
  for (const tool of tools)
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.schema,
        annotations: {
          readOnlyHint: true,
          destructiveHint: false,
          openWorldHint: false,
        },
      },
      async (args: unknown, extra: ServerContext): Promise<CallToolResult> => {
        try {
          const userId = extra.http?.authInfo?.extra?.userId;
          if (typeof userId !== "string") throw Error("UNAUTHORIZED");
          const { client, origin } = await canvasFor(userId);
          const result = await runTool(tool, args, client, origin);
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          const code =
            error && typeof error === "object" && "code" in error
              ? String(error.code)
              : "";
          const text =
            message === "CANVAS_NOT_CONNECTED"
              ? "Connect your school on the companion website before using this tool."
              : message === "RATE_LIMITED"
                ? "Please wait a minute before requesting more course data."
                : code === "CANVAS_UNAUTHORIZED"
                  ? "Your Canvas token has expired or was revoked. Reconnect your school."
                  : code === "CANVAS_FORBIDDEN"
                    ? "Your Canvas account does not have permission to read this resource."
                    : "Canvas could not complete this request. Try again or reconnect your school.";
          return { isError: true, content: [{ type: "text", text }] };
        }
      },
    );
});
const authenticate = (request: Request) => withMcpAuth(
  handler,
  async (_request, bearerToken) => {
    if (!bearerToken) return undefined;
    try {
      const identity = await verifyMcpToken(bearerToken);
      return {
        token: bearerToken,
        clientId: identity.clientId,
        scopes: ["canvas:read"],
        extra: { userId: identity.userId },
      };
    } catch {
      return undefined;
    }
  },
  {
    required: true,
    requiredScopes: ["canvas:read"],
    resourceMetadataPath: "/.well-known/oauth-protected-resource/mcp",
    resourceUrl: resource(),
  },
)(request);
async function handle(request: Request) {
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(resource()).origin &&
    !["https://chatgpt.com", "https://chat.openai.com"].includes(
      request.headers.get("origin")!,
    )
  )
    return new Response("Origin denied", { status: 403 });
  return authenticate(request);
}
export { handle as GET, handle as POST };
