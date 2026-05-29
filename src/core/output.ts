import { redactSecrets } from "./redaction.js";

export type OutputFormat = "json" | "pretty" | "table" | "ndjson";

export type Success<T> = {
  ok: true;
  data: T;
  meta?: Record<string, unknown>;
};

export type Failure = {
  ok: false;
  error: {
    code: string;
    message: string;
    status?: number;
    retryable: boolean;
  };
};

export type ResultEnvelope<T> = Success<T> | Failure;

export function formatOutput<T>(
  result: ResultEnvelope<T>,
  options: { format?: OutputFormat } = {}
): string {
  const format = options.format ?? "json";
  const safeResult = redactSecrets(result) as ResultEnvelope<T>;

  if (format === "json") {
    return `${JSON.stringify(safeResult, null, 2)}\n`;
  }

  if (format === "ndjson") {
    return `${JSON.stringify(safeResult)}\n`;
  }

  if (!safeResult.ok) {
    const status = safeResult.error.status ? ` (${safeResult.error.status})` : "";
    return `Error ${safeResult.error.code}${status}: ${safeResult.error.message}\n`;
  }

  if (format === "table") {
    return tableOutput(safeResult.data);
  }

  return prettyOutput(safeResult.data);
}

export async function writeOutput<T>(
  result: ResultEnvelope<T>,
  options: { format?: OutputFormat } = {}
): Promise<void> {
  const stream = result.ok ? process.stdout : process.stderr;
  stream.write(formatOutput(result, options));
}

function prettyOutput(data: unknown): string {
  if (typeof data === "string") {
    return `${data}\n`;
  }
  return `${JSON.stringify(data, null, 2)}\n`;
}

function tableOutput(data: unknown): string {
  if (!Array.isArray(data)) {
    return prettyOutput(data);
  }

  if (data.length === 0) {
    return "\n";
  }

  const rows = data.filter((row): row is Record<string, unknown> => {
    return row !== null && typeof row === "object" && !Array.isArray(row);
  });

  if (rows.length === 0) {
    return prettyOutput(data);
  }

  const columns = Object.keys(rows[0] ?? {});
  const widths = columns.map((column) =>
    Math.max(column.length, ...rows.map((row) => String(row[column] ?? "").length))
  );

  const line = (values: string[]) =>
    `${values.map((value, index) => value.padEnd(widths[index] ?? value.length)).join("  ")}\n`;

  let output = line(columns);
  output += line(widths.map((width) => "-".repeat(width)));
  for (const row of rows) {
    output += line(columns.map((column) => String(row[column] ?? "")));
  }
  return output;
}
