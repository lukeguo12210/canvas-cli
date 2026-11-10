import { it, expect, vi, beforeEach } from "vitest";
import { CanvasClient } from "@canvas/core/canvas-client";
vi.mock("./auth-token", () => ({
  verifyMcpToken: async (token: string) => {
    if (token !== "valid-fixture") throw Error("UNAUTHORIZED");
    return { userId: "owner-a", clientId: "fixture" };
  },
}));
const state = vi.hoisted(() => ({ calls: [] as string[] }));
vi.mock("./connections", () => ({
  canvasFor: async (owner: string) => {
    state.calls.push(owner);
    return {
      origin: "https://school.edu",
      client: new CanvasClient({
        baseUrl: "https://school.edu",
        token: "never-return-this",
        fetchImpl: async () =>
          Response.json([
            { id: "1", name: "Course", access_token: "never-return-this" },
          ]),
      }),
    };
  },
}));
vi.mock("./config", () => ({
  resource: () => "https://companion.example/mcp",
}));
import { POST } from "../app/mcp/route";
function call(method: string, params?: unknown, token?: string) {
  return POST(
    new Request("https://companion.example/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    }),
  );
}
async function responseData(response: Response) {
  const text = await response.text();
  if (text.startsWith("event:"))
    return JSON.parse(
      text
        .split("\n")
        .find((s) => s.startsWith("data:"))!
        .slice(5),
    );
  return JSON.parse(text);
}
beforeEach(() => state.calls.splice(0));
it("challenges missing and invalid credentials before invoking Canvas", async () => {
  expect((await call("tools/list")).status).toBe(401);
  expect((await call("tools/list", undefined, "bad")).status).toBe(401);
  expect(state.calls).toEqual([]);
});
it("exposes exactly eight bounded read-only tools", async () => {
  const response = await call("tools/list", undefined, "valid-fixture");
  expect(response.status).toBe(200);
  const result = await responseData(response);
  expect(result.result.tools).toHaveLength(8);
  for (const tool of result.result.tools) {
    expect(tool.annotations).toMatchObject({
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    });
    expect(tool.inputSchema.properties).not.toHaveProperty("token");
    expect(tool.inputSchema.properties).not.toHaveProperty("base_url");
  }
});
it("binds calls to the verified owner and never returns school tokens", async () => {
  const response = await call(
    "tools/call",
    { name: "list_courses", arguments: {} },
    "valid-fixture",
  );
  const data = await responseData(response);
  expect(state.calls).toEqual(["owner-a"]);
  expect(JSON.stringify(data)).not.toContain("never-return-this");
  expect(JSON.stringify(data)).toContain("https://school.edu/courses/1");
});
it("rejects traversal before Canvas access", async () => {
  const response = await call(
    "tools/call",
    {
      name: "get_assignment",
      arguments: { course_id: "../users", assignment_id: "1" },
    },
    "valid-fixture",
  );
  const data = await responseData(response);
  expect(data.error ?? data.result?.isError).toBeTruthy();
  expect(state.calls).toEqual([]);
});
it("rejects cross-site browser origins", async () => {
  const response = await POST(
    new Request("https://companion.example/mcp", {
      method: "POST",
      headers: { Origin: "https://attacker.example" },
    }),
  );
  expect(response.status).toBe(403);
});
