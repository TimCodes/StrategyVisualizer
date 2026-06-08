import { OpenAIProvider } from "./openai";
import { AnthropicProvider } from "./anthropic";
import { GeminiProvider } from "./gemini";
import type {
  LLMProvider,
  LLMModel,
  LLMProviderType,
  Message,
  CompletionOptions,
  LLMResponse,
  StreamToken,
} from "./types";
import { MODEL_TO_PROVIDER } from "./types";
import { classifyProviderError, LLMError } from "./errors";

export * from "./types";
export * from "./errors";

const providers: Record<LLMProviderType, LLMProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  gemini: new GeminiProvider(),
};

function getTimeoutMs(): number {
  return parseInt(process.env.LLM_TIMEOUT_MS ?? "60000", 10);
}

function getMaxRetries(): number {
  return parseInt(process.env.LLM_MAX_RETRIES ?? "3", 10);
}

export interface ResilienceOptions {
  timeoutMs?: number;
  maxRetries?: number;
  /** Test-only: set to 0 to disable backoff delay */
  _baseDelayMs?: number;
}

export async function withResilience<T>(
  fn: () => Promise<T>,
  meta: { provider: string; model: string },
  opts: ResilienceOptions = {}
): Promise<T> {
  const timeoutMs = opts.timeoutMs ?? getTimeoutMs();
  const maxRetries = opts.maxRetries ?? getMaxRetries();
  const baseDelay = opts._baseDelayMs !== undefined ? opts._baseDelayMs : 1000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error("__LLM_TIMEOUT__")),
            timeoutMs
          );
        }),
      ]);
      clearTimeout(timeoutId);
      return result;
    } catch (rawErr) {
      clearTimeout(timeoutId);
      const err = classifyProviderError(rawErr, meta.provider, meta.model);

      if (!err.retryable || attempt >= maxRetries) {
        throw err;
      }

      const jitter = Math.random() * 500;
      const waitMs = Math.max(
        err.retryAfterMs ?? 0,
        baseDelay * Math.pow(2, attempt) + jitter
      );
      await new Promise<void>((r) => setTimeout(r, Math.round(waitMs)));
    }
  }

  throw new LLMError({
    category: "unknown",
    provider: meta.provider,
    model: meta.model,
    retryable: false,
    userMessage: "Max retries exceeded",
  });
}

export class LLMService {
  private getProvider(model: LLMModel): LLMProvider {
    const providerType = MODEL_TO_PROVIDER[model];
    return providers[providerType];
  }

  async complete(
    messages: Message[],
    options: CompletionOptions
  ): Promise<LLMResponse> {
    const startTime = Date.now();
    const provider = this.getProvider(options.model);
    const providerType = MODEL_TO_PROVIDER[options.model];

    return withResilience(
      () =>
        provider.complete(messages, options).then((content) => ({
          content,
          provider: provider.name,
          model: options.model,
          duration: Date.now() - startTime,
        })),
      { provider: providerType, model: options.model }
    );
  }

  async *stream(
    messages: Message[],
    options: CompletionOptions
  ): AsyncIterable<StreamToken> {
    const provider = this.getProvider(options.model);
    const providerType = MODEL_TO_PROVIDER[options.model];
    const timeoutMs = getTimeoutMs();

    const iter = provider.stream(messages, options)[Symbol.asyncIterator]();

    try {
      // Apply timeout to first token only — can't safely retry a partial stream
      const firstResult = await Promise.race([
        iter.next(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("__LLM_TIMEOUT__")), timeoutMs)
        ),
      ]);
      if (!firstResult.done) yield firstResult.value;

      // Remaining tokens — no timeout, classify errors
      while (true) {
        const result = await iter.next();
        if (result.done) break;
        yield result.value;
      }
    } catch (rawErr) {
      throw classifyProviderError(rawErr, providerType, options.model);
    }
  }

  async getProviderStatus(): Promise<Record<LLMProviderType, boolean>> {
    const [openai, anthropic, gemini] = await Promise.all([
      providers.openai.isAvailable(),
      providers.anthropic.isAvailable(),
      providers.gemini.isAvailable(),
    ]);

    return { openai, anthropic, gemini };
  }

  async compareModels(
    messages: Message[],
    models: LLMModel[],
    options: Omit<CompletionOptions, "model">
  ): Promise<LLMResponse[]> {
    const results = await Promise.all(
      models.map(async (model) => {
        try {
          return await this.complete(messages, { ...options, model });
        } catch (rawErr) {
          const err =
            rawErr instanceof LLMError
              ? rawErr
              : classifyProviderError(rawErr, MODEL_TO_PROVIDER[model], model);
          return {
            content: err.userMessage,
            provider: MODEL_TO_PROVIDER[model],
            model,
            duration: 0,
            error: true,
            errorCategory: err.category,
          } satisfies LLMResponse;
        }
      })
    );

    return results;
  }
}

export const llmService = new LLMService();
