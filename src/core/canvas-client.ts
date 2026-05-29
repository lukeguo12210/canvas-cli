import { CanvasCliError } from "./errors.js";
import { parseLinkHeader } from "./pagination.js";
import { redactSecrets } from "./redaction.js";

export type CanvasClientOptions = {
  baseUrl: string;
  token: string;
  fetchImpl?: typeof fetch;
};

export type RequestOptions = {
  query?: Record<string, string | number | boolean | Array<string | number | boolean> | undefined>;
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

  constructor(options: CanvasClientOptions) {
    this.baseUrl = normalizeBaseUrl(options.baseUrl);
    this.token = options.token;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async get<T>(path: string, options: RequestOptions = {}): Promise<CanvasResponse<T>> {
    if (!path.startsWith("/api/v1/")) {
      throw new CanvasCliError("INVALID_API_PATH", "Canvas API paths must start with /api/v1/.");
    }

    let nextUrl: string | null = buildUrl(this.baseUrl, path, options.query);
    const pages: unknown[] = [];
    let pagesFetched = 0;
    const pageLimit = options.pageLimit ?? 50;

    let hasNext = false;

    while (nextUrl) {
      pagesFetched += 1;
      if (pagesFetched > pageLimit) {
        throw new CanvasCliError(
          "PAGE_LIMIT_EXCEEDED",
          `Stopped after ${pageLimit} pages. Increase --page-limit if needed.`
        );
      }

      const response = await this.fetchImpl(nextUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.token}`,
          Accept: "application/json+canvas-string-ids"
        }
      }).catch((error: unknown) => {
        throw new CanvasCliError("CANVAS_NETWORK_ERROR", "Could not reach Canvas.", {
          retryable: true,
          cause: error
        });
      });

      if (!response.ok) {
        throw new CanvasCliError(
          mapStatusCode(response.status),
          `Canvas request failed with status ${response.status}.`,
          { status: response.status, retryable: response.status === 429 || response.status >= 500 }
        );
      }

      const data = (await response.json()) as unknown;
      pages.push(data);

      const links = parseLinkHeader(response.headers.get("link"));
      hasNext = Boolean(links.next);
      nextUrl = options.pageAll ? links.next ?? null : null;
    }

    const merged = mergePages(pages) as T;
    return {
      data: redactSecrets(merged) as T,
      meta: {
        request: {
          method: "GET",
          path
        },
        pagination: {
          pagesFetched,
          hasNext
        }
      }
    };
  }

  async download(url: string): Promise<CanvasDownload> {
    const response = await this.fetchImpl(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: "*/*"
      }
    }).catch((error: unknown) => {
      throw new CanvasCliError("CANVAS_NETWORK_ERROR", "Could not reach Canvas.", {
        retryable: true,
        cause: error
      });
    });

    if (!response.ok) {
      throw new CanvasCliError(
        mapStatusCode(response.status),
        `Canvas download failed with status ${response.status}.`,
        { status: response.status, retryable: response.status === 429 || response.status >= 500 }
      );
    }

    return {
      data: new Uint8Array(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") ?? undefined,
      filename: filenameFromContentDisposition(response.headers.get("content-disposition")),
      meta: {
        request: {
          method: "GET",
          url: redactSecrets(url) as string
        }
      }
    };
  }
}

export function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  const url = new URL(trimmed);

  if (url.protocol !== "https:") {
    throw new CanvasCliError("INVALID_BASE_URL", "Canvas base URL must use https://.");
  }

  if (url.pathname.includes("/api/")) {
    throw new CanvasCliError("INVALID_BASE_URL", "Canvas base URL should not include /api/.");
  }

  url.pathname = url.pathname.replace(/\/+$/, "");
  url.search = "";
  url.hash = "";
  return url.toString().replace(/\/+$/, "");
}

function buildUrl(
  baseUrl: string,
  path: string,
  query: RequestOptions["query"] = {}
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

function filenameFromContentDisposition(header: string | null): string | undefined {
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
