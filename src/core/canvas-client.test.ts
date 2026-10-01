import { describe, expect, it } from "vitest";
import { CanvasClient, normalizeBaseUrl } from "./canvas-client.js";

describe("normalizeBaseUrl", () => {
  it("normalizes valid Canvas base URLs", () => {
    expect(normalizeBaseUrl("https://canvas.example.edu/")).toBe(
      "https://canvas.example.edu",
    );
  });

  it("rejects non-https URLs", () => {
    expect(() => normalizeBaseUrl("http://canvas.example.edu")).toThrow(
      "Canvas base URL must use https://",
    );
  });

  it("rejects API paths as base URLs", () => {
    expect(() => normalizeBaseUrl("https://canvas.example.edu/api/v1")).toThrow(
      "should not include /api/",
    );
  });
});

describe("CanvasClient", () => {
  it("performs GET requests with auth and query params", async () => {
    const calls: Array<{
      url: string;
      authorization: string | null;
      accept: string | null;
    }> = [];
    const client = new CanvasClient({
      baseUrl: "https://canvas.example.edu",
      token: "secret-token",
      fetchImpl: async (input, init) => {
        const headers = new Headers(init?.headers);
        calls.push({
          url: String(input),
          authorization: headers.get("authorization"),
          accept: headers.get("accept"),
        });
        return new Response(JSON.stringify([{ id: "1", name: "Course" }]), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });

    const response = await client.get<Array<{ id: string; name: string }>>(
      "/api/v1/courses",
      {
        query: { enrollment_state: "active" },
      },
    );

    expect(calls).toEqual([
      {
        url: "https://canvas.example.edu/api/v1/courses?enrollment_state=active",
        authorization: "Bearer secret-token",
        accept: "application/json+canvas-string-ids",
      },
    ]);
    expect(response.data).toEqual([{ id: "1", name: "Course" }]);
    expect(response.meta.pagination.pagesFetched).toBe(1);
  });

  it("follows Canvas next links when pageAll is true", async () => {
    const pages = [
      new Response(JSON.stringify([{ id: "1" }]), {
        headers: {
          link: '<https://canvas.example.edu/api/v1/courses?page=2>; rel="next"',
        },
      }),
      new Response(JSON.stringify([{ id: "2" }])),
    ];

    const client = new CanvasClient({
      baseUrl: "https://canvas.example.edu",
      token: "secret-token",
      fetchImpl: async () => pages.shift() ?? new Response("[]"),
    });

    const response = await client.get<Array<{ id: string }>>(
      "/api/v1/courses",
      {
        pageAll: true,
      },
    );

    expect(response.data).toEqual([{ id: "1" }, { id: "2" }]);
    expect(response.meta.pagination.pagesFetched).toBe(2);
  });

  it("maps fetch failures to Canvas network errors", async () => {
    const client = new CanvasClient({
      baseUrl: "https://canvas.example.edu",
      token: "secret-token",
      fetchImpl: async () => {
        throw new TypeError("fetch failed");
      },
    });

    await expect(client.get("/api/v1/courses")).rejects.toMatchObject({
      code: "CANVAS_NETWORK_ERROR",
      retryable: true,
    });
  });
});

describe("credential and response boundaries", () => {
  it("rejects cross-origin pagination before sending credentials", async () => {
    let calls = 0;
    const client = new CanvasClient({
      baseUrl: "https://school.edu",
      token: "secret",
      fetchImpl: async () => {
        calls++;
        return new Response("[]", {
          headers: {
            link: '<https://evil.example/api/v1/courses?page=2>; rel="next"',
          },
        });
      },
    });
    await expect(
      client.get("/api/v1/courses", { pageAll: true }),
    ).rejects.toMatchObject({ code: "UNSAFE_PAGINATION" });
    expect(calls).toBe(1);
  });
  it("rejects API redirect responses instead of following them", async () => {
    const client = new CanvasClient({
      baseUrl: "https://school.edu",
      token: "secret",
      fetchImpl: async (_url, init) => {
        expect(init?.redirect).toBe("manual");
        return new Response(null, {
          status: 302,
          headers: { location: "https://evil.example" },
        });
      },
    });
    await expect(client.get("/api/v1/courses")).rejects.toThrow();
  });
  it("strips Canvas bearer on a download redirect to a CDN", async () => {
    const calls: Array<string | null> = [];
    const client = new CanvasClient({
      baseUrl: "https://school.edu",
      token: "secret",
      fetchImpl: async (_url, init) => {
        calls.push(new Headers(init?.headers).get("authorization"));
        return calls.length === 1
          ? new Response(null, {
              status: 302,
              headers: { location: "https://cdn.example/file" },
            })
          : new Response("safe");
      },
    });
    await client.download("https://school.edu/file");
    expect(calls).toEqual(["Bearer secret", null]);
  });
  it("rejects private and credential-bearing download targets", async () => {
    const client = new CanvasClient({
      baseUrl: "https://school.edu",
      token: "secret",
      fetchImpl: async () => {
        throw Error("must not fetch");
      },
    });
    await expect(
      client.download("https://127.0.0.1/file"),
    ).rejects.toMatchObject({ code: "UNSAFE_URL" });
    await expect(
      client.download("https://user:pass@example.com/file"),
    ).rejects.toMatchObject({ code: "UNSAFE_URL" });
  });
  it("bounds response bytes even when Content-Length is missing", async () => {
    const client = new CanvasClient({
      baseUrl: "https://school.edu",
      token: "secret",
      maxResponseBytes: 10,
      fetchImpl: async () => new Response("x".repeat(11)),
    });
    await expect(
      client.download("https://school.edu/file"),
    ).rejects.toMatchObject({ code: "RESPONSE_TOO_LARGE" });
  });
  it("stops pagination loops", async () => {
    const client = new CanvasClient({
      baseUrl: "https://school.edu",
      token: "secret",
      fetchImpl: async () =>
        new Response("[]", {
          headers: { link: '<https://school.edu/api/v1/courses>; rel="next"' },
        }),
    });
    await expect(
      client.get("/api/v1/courses", { pageAll: true }),
    ).rejects.toMatchObject({ code: "PAGINATION_LOOP" });
  });
});
