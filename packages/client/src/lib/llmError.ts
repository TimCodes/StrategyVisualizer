/**
 * Extract a human-readable message from a structured LLM error response.
 * apiRequest throws `new Error("STATUS: JSON_BODY")` on non-2xx responses.
 */
export function parseLLMError(err: unknown): string | null {
  if (err instanceof Error) {
    const colonIdx = err.message.indexOf(": ");
    if (colonIdx !== -1) {
      try {
        const body = JSON.parse(err.message.slice(colonIdx + 2));
        if (body?.error?.message) return String(body.error.message);
      } catch {
        /* not JSON */
      }
    }
  }
  return null;
}
