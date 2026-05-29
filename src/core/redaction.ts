const REDACTED = "[REDACTED]";

const SECRET_KEY_PATTERN = /(^|[_-])(authorization|access[_-]?token|token|api[_-]?key|secret)$/i;
const BEARER_PATTERN = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi;
const QUERY_SECRET_PATTERN = /([?&](?:access_token|token|api_key|verifier|code)=)[^&#\s]+/gi;

export function redactSecrets(value: unknown): unknown {
  if (typeof value === "string") {
    return redactString(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => redactSecrets(item));
  }

  if (value && typeof value === "object") {
    const output: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value)) {
      output[key] = SECRET_KEY_PATTERN.test(key) ? REDACTED : redactSecrets(nested);
    }
    return output;
  }

  return value;
}

export function redactString(value: string): string {
  return value
    .replace(BEARER_PATTERN, `Bearer ${REDACTED}`)
    .replace(QUERY_SECRET_PATTERN, `$1${REDACTED}`);
}

export function redactedValue(): string {
  return REDACTED;
}
