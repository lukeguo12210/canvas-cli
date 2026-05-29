export type LinkRelation = "current" | "next" | "prev" | "first" | "last";

export type ParsedLinks = Partial<Record<LinkRelation, string>>;

export function parseLinkHeader(header: string | null | undefined): ParsedLinks {
  if (!header) {
    return {};
  }

  const links: ParsedLinks = {};
  for (const part of splitHeader(header)) {
    const match = part.match(/^\s*<([^>]+)>\s*;\s*rel="([^"]+)"\s*$/i);
    if (!match) {
      continue;
    }
    const [, url, rel] = match;
    if (isLinkRelation(rel)) {
      links[rel] = url;
    }
  }
  return links;
}

function splitHeader(header: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of header) {
    if (char === "\"") {
      inQuotes = !inQuotes;
    }
    if (char === "," && !inQuotes) {
      parts.push(current);
      current = "";
      continue;
    }
    current += char;
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}

function isLinkRelation(value: string): value is LinkRelation {
  return ["current", "next", "prev", "first", "last"].includes(value);
}
