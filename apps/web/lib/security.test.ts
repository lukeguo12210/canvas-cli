import { describe, it, expect } from "vitest";
import { randomBytes } from "node:crypto";
import { seal, unseal } from "./crypto";
import { isPublicAddress, safeFetch } from "./safe-fetch";
import { customSchool } from "./schools";
import { projectFields, tools, runTool } from "./tools";
import { CanvasClient } from "@canvas/core/canvas-client";
describe("credential encryption", () => {
  const key = randomBytes(32).toString("base64");
  it("binds authenticated ciphertext to owner and institution", () => {
    const value = seal("canvas-secret", "user-1", "https://school.edu", key);
    expect(value).not.toContain("canvas-secret");
    expect(unseal(value, "user-1", "https://school.edu", key)).toBe(
      "canvas-secret",
    );
    expect(() => unseal(value, "user-2", "https://school.edu", key)).toThrow();
    expect(() => unseal(value, "user-1", "https://other.edu", key)).toThrow();
    expect(() =>
      unseal(value + "x", "user-1", "https://school.edu", key),
    ).toThrow();
  });
  it("uses unique nonces", () =>
    expect(seal("token", "a", "b", key)).not.toBe(
      seal("token", "a", "b", key),
    ));
});
describe("network boundaries", () => {
  it.each([
    "127.0.0.1",
    "10.0.0.1",
    "169.254.169.254",
    "192.168.0.1",
    "172.16.0.1",
    "0.0.0.0",
    "::1",
    "::ffff:127.0.0.1",
    "fc00::1",
    "fe80::1",
    "100.64.0.1",
    "224.0.0.1",
  ])("rejects non-public IP %s", (ip) =>
    expect(isPublicAddress(ip)).toBe(false),
  );
  it("accepts public IPs", () => expect(isPublicAddress("1.1.1.1")).toBe(true));
  it("rejects private DNS targets in the actual connection", async () => {
    await expect(
      safeFetch("https://localhost/", { signal: AbortSignal.timeout(2000) }),
    ).rejects.toThrow();
  });
  it.each([
    "http://example.com",
    "https://u:p@example.com",
    "https://example.com/path",
    "https://example.com/?access_token=secret",
    "https://example.com:8080",
  ])("rejects unsafe school origin %s", (url) =>
    expect(() => customSchool(url)).toThrow(),
  );
});
describe("tool output and inputs", () => {
  it("projects only requested fields and strips HTML/scripts and signed links", () => {
    expect(
      projectFields(
        {
          id: "1",
          body: "<script>steal()</script><b>Hello</b>",
          access_token: "secret",
          url: "https://cdn/?token=secret",
        },
        ["id", "body"],
      ),
    ).toEqual({ id: "1", body: "Hello" });
  });
  it.each(tools.filter((t) => "course_id" in t.schema.shape))(
    "rejects traversal for $name",
    (tool) => {
      expect(() => tool.schema.parse({ course_id: "../admin" })).toThrow();
    },
  );
  it("returns source links, bounded pagination and no credentials", async () => {
    const client = new CanvasClient({
      baseUrl: "https://school.edu",
      token: "secret",
      fetchImpl: async () =>
        Response.json([
          {
            id: "1",
            name: "Course",
            access_token: "secret",
            enrollments: [{ grades: "private" }],
          },
        ]),
    });
    const result = await runTool(tools[0], {}, client, "https://school.edu");
    expect(result.data).toEqual([
      { id: "1", name: "Course", source_url: "https://school.edu/courses/1" },
    ]);
    expect(result.page).toBe(1);
  });
});
