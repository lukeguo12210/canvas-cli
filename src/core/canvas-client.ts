import { CanvasCliError } from "./errors.js";
import { parseLinkHeader } from "./pagination.js";
import { redactSecrets } from "./redaction.js";

export type CanvasClientOptions = {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
  maxResponseBytes?: number;
  timeoutMs?: number;
};

export type RequestOptions = {
  query?: Record<
    string,
    string | number | boolean | Array<string | number | boolean> | undefined
  >;
  pageAll?: boolean;
  pageLimit?: number;
};

export type CanvasResponse<T> = {
  data: T;
  meta: {
    request: {
      method: "GET";
      path: string;
    };
    pagination: {
      pagesFetched: number;
      hasNext: boolean;
    };
  };
};

export type CanvasDownload = {
  data: Uint8Array;
  contentType?: string;
  filename?: string;
  meta: {
    request: {
      method: "GET";
      url: string;
    };
  };
};

export class CanvasClient {
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly fetchImpl: typeof fetch;
  private readonly maxResponseBytes: number;
  private readonly timeoutMs: number;

  constructor(options: CanvasClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.maxResponseBytes = options.maxResponseBytes ?? 20 * 1024 * 1024;
    this.timeoutMs = options.timeoutMs ?? 15000;
  }

  async get<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<CanvasResponse<T>> {
    if (!path.startsWith("/api/v1/")) {
      throw new CanvasCliError(
        "INVALID_API_PATH",
        "Canvas API paths must start with /api/v1/.",
      );
    }

    let nextUrl: string | null = buildUrl(this.baseUrl, path, options.query);
    const pages: unknown[] = [];
    let pagesFetched = 0;
    const pageLimit = options.pageLimit ?? 50;
    if (!Number.isInteger(pageLimit) || pageLimit < 1 || pageLimit > 100)
      throw new CanvasCliError(
        "INVALID_PAGE_LIMIT",
        "Page limit must be between 1 and 100.",
      );
    const seen = new Set<string>();
    const initialPath = new URL(nextUrl).pathname;

    let hasNext = false;

    while (nextUrl) {
      const destination = checkedUrl(nextUrl);
      if (
        destination.origin !== new URL(this.baseUrl).origin ||
        destination.pathname !== initialPath ||
        !destination.pathname.startsWith("/api/v1/")
      )
        throw new CanvasCliError(
          "UNSAFE_PAGINATION",
          "Canvas pagination left the requested API resource.",
        );
      if (seen.has(nextUrl))
        throw new CanvasCliError(
          "PAGINATION_LOOP",
          "Canvas repeated a pagination URL.",
        );
      seen.add(nextUrl);
      pagesFetched += 1;
      if (pagesFetched > pageLimit) {
        throw new CanvasCliError(
          "PAGE_LIMIT_EXCEEDED",
          `Stopped after ${pageLimit} pages. Increase --page-limit if needed.`,
        );
      }

      const response = await this.fetchImpl(nextUrl, {
        method: "GET",
        redirect: "manual",
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json+canvas-string-ids",
        },
      }).catch((error: unknown) => {
        throw new CanvasCliError(
          "CANVAS_NETWORK_ERROR",
          "Could not reach Canvas.",
          {
            retryable: true,
            cause: error,
          },
        );
      });

      if (!response.ok) {
        throw new CanvasCliError(
          mapStatusCode(response.status),
          `Canvas request failed with status ${response.status}.`,
          {
            status: response.status,
            retryable: response.status === 429 || response.status >= 500,
          },
        );
      }

      const data = JSON.parse(
        new TextDecoder().decode(
          await boundedBody(
            response,
            Math.min(this.maxResponseBytes, 2 * 1024 * 1024),
          ),
        ),
      ) as unknown;
      pages.push(data);

      const links = parseLinkHeader(response.headers.get("link"));
      hasNext = Boolean(links.next);
      nextUrl = options.pageAll ? (links.next ?? null) : null;
    }

    const merged = mergePages(pages) as T;
    return {
      data: redactSecrets(merged) as T,
      meta: {
        request: {
          method: "GET",
          path,
        },
        pagination: {
          pagesFetched,
          hasNext,
        },
      },
    };
  }

  async download(url: string): Promise<CanvasDownload> {
    let destination = checkedUrl(url);
    let response: Response | undefined;
    const signal = AbortSignal.timeout(this.timeoutMs);
    for (let redirects = 0; redirects <= 5; redirects++) {
      const headers: Record<string, string> = { Accept: "*/*" };
      if (destination.origin === new URL(this.baseUrl).origin)
        headers.Authorization = `Bearer ${this.token}`;
      response = await this.fetchImpl(destination.toString(), {
        method: "GET",
        headers,
        redirect: "manual",
        signal,
      }).catch((error: unknown) => {
        throw new CanvasCliError(
          "CANVAS_NETWORK_ERROR",
          "Could not reach Canvas.",
          { retryable: true, cause: error },
        );
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location || redirects === 5)
        throw new CanvasCliError(
          "UNSAFE_REDIRECT",
          "Canvas download exceeded its redirect limit.",
        );
      destination = checkedUrl(new URL(location, destination).toString());
    }
    if (!response)
      throw new CanvasCliError("CANVAS_NETWORK_ERROR", "No download response.");

    if (!response.ok) {
      throw new CanvasCliError(
        mapStatusCode(response.status),
        `Canvas download failed with status ${response.status}.`,
        {
          status: response.status,
          retryable: response.status === 429 || response.status >= 500,
        },
      );
    }

    return {
      data: await boundedBody(response, this.maxResponseBytes),
      contentType: response.headers.get("content-type") ?? undefined,
      filename: filenameFromContentDisposition(
        response.headers.get("content-disposition"),
      ),
      meta: {
        request: {
          method: "GET",
          url: redactSecrets(url) as string,
        },
      },
    };
  }
}

export function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  const url = checkedUrl(trimmed);

  if (url.protocol !== "https:") {
    throw new CanvasCliError(
      "INVALID_BASE_URL",
      "Canvas base URL must use https://.",
    );
  }

  if (url.pathname.includes("/api/")) {
    throw new CanvasCliError(
      "INVALID_BASE_URL",
      "Canvas base URL should not include /api/.",
    );
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

function buildUrl(
  baseUrl: string,
  path: string,
  query: RequestOptions["query"] = {},
): string {
  const url = new URL(path, baseUrl);
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined) {
      continue;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, String(item));
      }
      continue;
    }
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

function mergePages(pages: unknown[]): unknown {
  if (pages.length === 1) {
    return pages[0];
  }

  if (pages.every(Array.isArray)) {
    return pages.flat();
  }

  return pages;
}

function mapStatusCode(status: number): string {
  if (status === 401) return "CANVAS_UNAUTHORIZED";
  if (status === 403) return "CANVAS_FORBIDDEN";
  if (status === 404) return "CANVAS_NOT_FOUND";
  if (status === 429) return "CANVAS_RATE_LIMITED";
  if (status >= 500) return "CANVAS_SERVER_ERROR";
  return "CANVAS_REQUEST_FAILED";
}

function filenameFromContentDisposition(
  header: string | null,
): string | undefined {
  if (!header) {
    return undefined;
  }
  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }
  const match = /filename="?([^";]+)"?/i.exec(header);
  return match?.[1];
}

export function checkedUrl(input: string): URL {
  const url = new URL(input);
  if (url.protocol !== "https:")
    throw new CanvasCliError(
      "INVALID_BASE_URL",
      "Canvas base URL must use https://.",
    );
  if (url.username || url.password || (url.port && url.port !== "443"))
    throw new CanvasCliError(
      "UNSAFE_URL",
      "Canvas URLs must use HTTPS without credentials or custom ports.",
    );
  const host = url.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    host.startsWith("[") ||
    /^(?:0|10|127|169\.254|192\.168|172\.(?:1[6-9]|2[0-9]|3[01]))(?:\.|$)/.test(
      host,
    )
  )
    throw new CanvasCliError(
      "UNSAFE_URL",
      "Private network destinations are not allowed.",
    );
  return url;
}

export async function boundedBody(
  response: Response,
  maximum: number,
): Promise<Uint8Array> {
  if (Number(response.headers.get("content-length")) > maximum) {
    await response.body?.cancel();
    throw new CanvasCliError(
      "RESPONSE_TOO_LARGE",
      "Canvas response is too large.",
    );
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > maximum) {
        await reader.cancel();
        throw new CanvasCliError(
          "RESPONSE_TOO_LARGE",
          "Canvas response is too large.",
        );
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}
