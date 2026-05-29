export class CanvasCliError extends Error {
  readonly code: string;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(
    code: string,
    message: string,
    options: { status?: number; retryable?: boolean; cause?: unknown } = {}
  ) {
    super(message, { cause: options.cause });
    this.name = "CanvasCliError";
    this.code = code;
    this.status = options.status;
    this.retryable = options.retryable ?? false;
  }
}

export function toErrorEnvelope(error: unknown) {
  if (error instanceof CanvasCliError) {
    return {
      ok: false as const,
      error: {
        code: error.code,
        message: error.message,
        status: error.status,
        retryable: error.retryable
      }
    };
  }

  const message = error instanceof Error ? error.message : String(error);
  return {
    ok: false as const,
    error: {
      code: "UNEXPECTED_ERROR",
      message,
      retryable: false
    }
  };
}
