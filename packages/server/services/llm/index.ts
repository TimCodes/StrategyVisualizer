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

export * from "./types";

const providers: Record<LLMProviderType, LLMProvider> = {
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  gemini: new GeminiProvider(),
};

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

    const content = await provider.complete(messages, options);

    return {
      content,
      provider: provider.name,
      model: options.model,
      duration: Date.now() - startTime,
    };
  }

  async *stream(
    messages: Message[],
    options: CompletionOptions
  ): AsyncIterable<StreamToken> {
    const provider = this.getProvider(options.model);
    yield* provider.stream(messages, options);
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
      models.map((model) =>
        this.complete(messages, { ...options, model }).catch((error) => ({
          content: `Error: ${error.message}`,
          provider: MODEL_TO_PROVIDER[model],
          model,
          duration: 0,
        }))
      )
    );

    return results;
  }
}

export const llmService = new LLMService();
