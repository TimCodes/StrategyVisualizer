import { LLMError } from "../services/llm/errors";

const CATEGORY_TO_STATUS: Record<string, number> = {
  rate_limit: 429,
  auth: 401,
  unavailable: 503,
  timeout: 504,
  server_error: 502,
  invalid_request: 400,
  unknown: 500,
};

export interface LLMErrorBody {
  error: {
    category: string;
    message: string;
    provider?: string;
    model?: string;
    retryable: boolean;
  };
}

export function llmErrorToResponse(err: unknown): { status: number; body: LLMErrorBody } {
  if (err instanceof LLMError) {
    return {
      status: CATEGORY_TO_STATUS[err.category] ?? 500,
      body: {
        error: {
          category: err.category,
          message: err.userMessage,
          provider: err.provider,
          model: err.model,
          retryable: err.retryable,
        },
      },
    };
  }
  return {
    status: 500,
    body: {
      error: {
        category: "unknown",
        message: "An unexpected error occurred",
        retryable: false,
      },
    },
  };
}
