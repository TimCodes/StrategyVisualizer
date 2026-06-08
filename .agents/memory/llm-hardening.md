---
name: LLM hardening architecture
description: Retry/backoff, typed errors, and UI surfacing pattern for all LLM calls in Praxis.
---

## The rule
Every LLM call goes through `withResilience()`. Routes return structured `{ error: { category, message, provider, model, retryable } }`. Client parses with `parseLLMError()`.

## Key files
- `packages/server/services/llm/errors.ts` — `LLMError`, `LLMErrorCategory`, `classifyProviderError()`
- `packages/server/services/llm/index.ts` — `withResilience<T>()` (exported standalone), `LLMService`
- `packages/server/lib/llmErrorResponse.ts` — `llmErrorToResponse()` shared route helper
- `packages/client/src/lib/llmError.ts` — `parseLLMError()` client helper

## classifyProviderError mapping
| status / signal | category | retryable |
|---|---|---|
| 429 | rate_limit | yes |
| 401, 403 | auth | no |
| 400, 422 | invalid_request | no |
| 408 / abort / `__LLM_TIMEOUT__` | timeout | yes |
| 5xx | server_error | yes |
| fetch failed / ECONNRESET / network | unavailable | yes |
| already LLMError | passthrough | — |
| anything else | unknown | no |

Reads `Retry-After` header (supports fractional seconds) → `retryAfterMs`.

## withResilience options
```typescript
interface ResilienceOptions {
  timeoutMs?: number;   // default: LLM_TIMEOUT_MS env (60000)
  maxRetries?: number;  // default: LLM_MAX_RETRIES env (3)
  _baseDelayMs?: number; // test-only: set 0 to skip backoff delays
}
```
Backoff: `max(retryAfterMs, baseDelay * 2^attempt + jitter)`. Non-retryable errors skip retry loop entirely.

## HTTP status map (llmErrorToResponse)
rate_limit→429, auth→401, unavailable→503, timeout→504, server_error→502, invalid_request→400, unknown→500.

## Client error parsing
`apiRequest` throws `new Error("STATUS: JSON_BODY")`. `parseLLMError(err)` extracts `body.error.message`. Returns `null` if not a structured LLM error (caller provides fallback).

## Arena error cards
`LLMResponse` has optional `error?: boolean; errorCategory?: string`. `compareModels()` catches per-model errors and returns them inline (no vote buttons, amber warning panel). Arena.tsx `onError` populates all result slots with the error message.

## Tests
`packages/server/services/__tests__/llm-resilience.test.ts` — 20 tests, all pass.
Run: `npx vitest run packages/server/services/__tests__/llm-resilience.test.ts`

**Why:** LLM providers return intermittent 429/5xx/network errors. Without retry+backoff the user sees raw failures. Non-retryable errors (auth/bad-request) must never loop.

**How to apply:** Any new LLM call site should wrap in `withResilience()`. Any new route catching an LLM error should call `llmErrorToResponse()`. Any new client catching an LLM mutation error should call `parseLLMError()`.
