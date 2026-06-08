export type LLMErrorCategory =
  | "rate_limit"
  | "auth"
  | "timeout"
  | "invalid_request"
  | "server_error"
  | "unavailable"
  | "unknown";

interface LLMErrorOptions {
  category: LLMErrorCategory;
  provider: string;
  model: string;
  statusCode?: number;
  retryable: boolean;
  retryAfterMs?: number;
  userMessage: string;
}

export class LLMError extends Error {
  readonly category: LLMErrorCategory;
  readonly provider: string;
  readonly model: string;
  readonly statusCode?: number;
  readonly retryable: boolean;
  readonly retryAfterMs?: number;
  readonly userMessage: string;

  constructor(opts: LLMErrorOptions) {
    super(opts.userMessage);
    this.name = "LLMError";
    this.category = opts.category;
    this.provider = opts.provider;
    this.model = opts.model;
    this.statusCode = opts.statusCode;
    this.retryable = opts.retryable;
    this.retryAfterMs = opts.retryAfterMs;
    this.userMessage = opts.userMessage;
  }
}

function capitalize(s: string): string {
  if (s === "openai") return "OpenAI";
  if (s === "anthropic") return "Anthropic";
  if (s === "gemini") return "Gemini";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function getStatus(err: unknown): number | undefined {
  if (err && typeof err === "object") {
    const e = err as Record<string, unknown>;
    if (typeof e.status === "number") return e.status;
    if (typeof e.code === "number" && (e.code as number) >= 100) return e.code as number;
    const msg = typeof e.message === "string" ? e.message : "";
    const m = msg.match(/^(\d{3})[\s:]/);
    if (m) return parseInt(m[1], 10);
  }
  return undefined;
}

function getRetryAfterMs(err: unknown): number | undefined {
  if (!err || typeof err !== "object") return undefined;
  const e = err as Record<string, unknown>;
  const headers = (e.headers ?? (e as any).response?.headers) as
    | Record<string, string>
    | undefined;
  if (headers) {
    const ra = headers["retry-after"] ?? headers["Retry-After"];
    if (ra) {
      const secs = parseFloat(ra);
      if (!isNaN(secs)) return Math.ceil(secs * 1000);
    }
  }
  return undefined;
}

function isNetworkError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const msg = ((err as any).message ?? "").toLowerCase();
  const code = String((err as any).code ?? "");
  return (
    msg.includes("fetch failed") ||
    msg.includes("econnreset") ||
    msg.includes("enotfound") ||
    msg.includes("network error") ||
    code === "ECONNRESET" ||
    code === "ENOTFOUND"
  );
}

function isAbortOrTimeout(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as any;
  if (e.name === "AbortError") return true;
  const msg = (e.message ?? "").toLowerCase();
  return msg.includes("__llm_timeout__") || msg.includes("aborted") || msg.includes("timed out");
}

export function classifyProviderError(
  err: unknown,
  provider: string,
  model: string
): LLMError {
  if (err instanceof LLMError) return err;

  const status = getStatus(err);
  const cap = capitalize(provider);

  if (status === 429) {
    return new LLMError({
      category: "rate_limit",
      provider,
      model,
      statusCode: 429,
      retryable: true,
      retryAfterMs: getRetryAfterMs(err),
      userMessage: `Rate limited by ${cap} — try again shortly`,
    });
  }

  if (status === 401 || status === 403) {
    return new LLMError({
      category: "auth",
      provider,
      model,
      statusCode: status,
      retryable: false,
      userMessage: `${cap} API key missing or invalid`,
    });
  }

  if (status === 408 || isAbortOrTimeout(err)) {
    return new LLMError({
      category: "timeout",
      provider,
      model,
      retryable: true,
      userMessage: `${cap} request timed out`,
    });
  }

  if (status === 400 || status === 422) {
    const msg = String((err as any)?.message ?? "");
    return new LLMError({
      category: "invalid_request",
      provider,
      model,
      statusCode: status,
      retryable: false,
      userMessage: `Invalid request to ${cap}${msg ? `: ${msg.slice(0, 120)}` : ""}`,
    });
  }

  if (status !== undefined && status >= 500) {
    return new LLMError({
      category: "server_error",
      provider,
      model,
      statusCode: status,
      retryable: true,
      userMessage: `${cap} service error — retrying`,
    });
  }

  if (isNetworkError(err)) {
    return new LLMError({
      category: "unavailable",
      provider,
      model,
      retryable: true,
      userMessage: `${cap} is currently unreachable`,
    });
  }

  return new LLMError({
    category: "unknown",
    provider,
    model,
    retryable: false,
    userMessage: `Unexpected error from ${cap}`,
  });
}
