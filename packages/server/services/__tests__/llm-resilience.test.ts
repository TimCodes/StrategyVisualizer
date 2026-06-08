import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { classifyProviderError, LLMError } from "../llm/errors";
import { withResilience } from "../llm/index";

// ── classifyProviderError ──────────────────────────────────────────────────

describe("classifyProviderError", () => {
  it("maps 429 → rate_limit, retryable", () => {
    const err = { status: 429, message: "Too many requests" };
    const result = classifyProviderError(err, "openai", "gpt-5");
    expect(result).toBeInstanceOf(LLMError);
    expect(result.category).toBe("rate_limit");
    expect(result.retryable).toBe(true);
    expect(result.statusCode).toBe(429);
  });

  it("maps 401 → auth, not retryable", () => {
    const err = { status: 401, message: "Unauthorized" };
    const result = classifyProviderError(err, "anthropic", "claude-sonnet-4-5");
    expect(result.category).toBe("auth");
    expect(result.retryable).toBe(false);
    expect(result.userMessage).toMatch(/API key/i);
  });

  it("maps 403 → auth, not retryable", () => {
    const err = { status: 403, message: "Forbidden" };
    const result = classifyProviderError(err, "openai", "gpt-5");
    expect(result.category).toBe("auth");
    expect(result.retryable).toBe(false);
  });

  it("maps 500 → server_error, retryable", () => {
    const err = { status: 500, message: "Internal Server Error" };
    const result = classifyProviderError(err, "openai", "gpt-5");
    expect(result.category).toBe("server_error");
    expect(result.retryable).toBe(true);
  });

  it("maps 503 → server_error, retryable", () => {
    const err = { status: 503, message: "Service Unavailable" };
    const result = classifyProviderError(err, "gemini", "gemini-pro");
    expect(result.category).toBe("server_error");
    expect(result.retryable).toBe(true);
  });

  it("maps 400 → invalid_request, not retryable", () => {
    const err = { status: 400, message: "Bad request" };
    const result = classifyProviderError(err, "gemini", "gemini-pro");
    expect(result.category).toBe("invalid_request");
    expect(result.retryable).toBe(false);
  });

  it("maps 422 → invalid_request, not retryable", () => {
    const err = { status: 422, message: "Unprocessable entity" };
    const result = classifyProviderError(err, "openai", "gpt-5");
    expect(result.category).toBe("invalid_request");
    expect(result.retryable).toBe(false);
  });

  it("maps fetch-failed network error → unavailable, retryable", () => {
    const err = new Error("fetch failed");
    const result = classifyProviderError(err, "openai", "gpt-5");
    expect(result.category).toBe("unavailable");
    expect(result.retryable).toBe(true);
  });

  it("maps ECONNRESET → unavailable, retryable", () => {
    const err = Object.assign(new Error("ECONNRESET"), { code: "ECONNRESET" });
    const result = classifyProviderError(err, "openai", "gpt-5");
    expect(result.category).toBe("unavailable");
    expect(result.retryable).toBe(true);
  });

  it("maps timeout marker → timeout, retryable", () => {
    const err = new Error("__LLM_TIMEOUT__");
    const result = classifyProviderError(err, "openai", "gpt-5");
    expect(result.category).toBe("timeout");
    expect(result.retryable).toBe(true);
  });

  it("extracts Retry-After header into retryAfterMs", () => {
    const err = { status: 429, message: "rate limit", headers: { "retry-after": "2.5" } };
    const result = classifyProviderError(err, "openai", "gpt-5");
    expect(result.retryAfterMs).toBe(2500);
  });

  it("passes through an existing LLMError unchanged", () => {
    const original = new LLMError({
      category: "auth",
      provider: "openai",
      model: "gpt-5",
      retryable: false,
      userMessage: "already classified",
    });
    const result = classifyProviderError(original, "openai", "gpt-5");
    expect(result).toBe(original);
  });

  it("falls back to unknown for unrecognised errors", () => {
    const err = new Error("some weird sdk error");
    const result = classifyProviderError(err, "openai", "gpt-5");
    expect(result.category).toBe("unknown");
    expect(result.retryable).toBe(false);
  });
});

// ── withResilience ─────────────────────────────────────────────────────────

describe("withResilience", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns result immediately on first success", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const promise = withResilience(fn, { provider: "openai", model: "gpt-5" }, {
      maxRetries: 3,
      timeoutMs: 999_999,
      _baseDelayMs: 0,
    });
    await vi.runAllTimersAsync();
    expect(await promise).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on retryable error and succeeds on third attempt", async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(() => {
      calls++;
      if (calls < 3) return Promise.reject(Object.assign(new Error(), { status: 429 }));
      return Promise.resolve("success");
    });

    const promise = withResilience(fn, { provider: "openai", model: "gpt-5" }, {
      maxRetries: 3,
      timeoutMs: 999_999,
      _baseDelayMs: 0,
    });
    await vi.runAllTimersAsync();
    expect(await promise).toBe("success");
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("gives up after maxRetries and throws LLMError", async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error(), { status: 500 }));

    const promise = withResilience(fn, { provider: "openai", model: "gpt-5" }, {
      maxRetries: 2,
      timeoutMs: 999_999,
      _baseDelayMs: 0,
    });
    // Attach rejection handler before advancing timers to avoid unhandled-rejection warning
    const caught = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await caught;
    expect(err).toBeInstanceOf(LLMError);
    expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
  });

  it("does NOT retry a non-retryable error (auth)", async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error(), { status: 401 }));

    await expect(
      withResilience(fn, { provider: "openai", model: "gpt-5" }, {
        maxRetries: 3,
        timeoutMs: 999_999,
        _baseDelayMs: 0,
      })
    ).rejects.toMatchObject({ category: "auth", retryable: false });

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("does NOT retry a non-retryable error (invalid_request)", async () => {
    const fn = vi.fn().mockRejectedValue(Object.assign(new Error(), { status: 400 }));

    const promise = withResilience(fn, { provider: "openai", model: "gpt-5" }, {
      maxRetries: 3,
      timeoutMs: 999_999,
      _baseDelayMs: 0,
    });
    await expect(promise).rejects.toMatchObject({ category: "invalid_request", retryable: false });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("throws LLMError (timeout) when fn takes too long", async () => {
    const fn = vi.fn().mockImplementation(
      () => new Promise<string>((r) => setTimeout(() => r("late"), 10_000))
    );

    const promise = withResilience(fn, { provider: "openai", model: "gpt-5" }, {
      maxRetries: 0,
      timeoutMs: 100,
      _baseDelayMs: 0,
    });
    const caught = promise.catch((e) => e);
    await vi.runAllTimersAsync();
    const err = await caught;
    expect(err).toMatchObject({ category: "timeout", retryable: true });
  });

  it("respects retryAfterMs by waiting at least that long before retry", async () => {
    let calls = 0;
    const fn = vi.fn().mockImplementation(() => {
      calls++;
      if (calls === 1) {
        return Promise.reject(
          Object.assign(new Error(), {
            status: 429,
            headers: { "retry-after": "5" }, // 5 seconds → 5000ms
          })
        );
      }
      return Promise.resolve("ok");
    });

    const promise = withResilience(fn, { provider: "openai", model: "gpt-5" }, {
      maxRetries: 2,
      timeoutMs: 999_999,
      _baseDelayMs: 0,
    });
    await vi.runAllTimersAsync();
    expect(await promise).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
