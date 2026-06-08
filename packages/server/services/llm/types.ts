import { z } from "zod";

export const llmProviderSchema = z.enum(["openai", "anthropic", "gemini"]);
export type LLMProviderType = z.infer<typeof llmProviderSchema>;

export const llmModelSchema = z.enum([
  "gpt-5",
  "claude-sonnet-4-5",
  "claude-opus-4-5",
  "claude-haiku-4-5",
  "gemini-pro",
]);
export type LLMModel = z.infer<typeof llmModelSchema>;

export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model: LLMModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface StreamToken {
  token: string;
  done: boolean;
}

export interface LLMProvider {
  name: LLMProviderType;
  complete(messages: Message[], options: CompletionOptions): Promise<string>;
  stream(
    messages: Message[],
    options: CompletionOptions
  ): AsyncIterable<StreamToken>;
  isAvailable(): Promise<boolean>;
}

export interface LLMResponse {
  content: string;
  provider: LLMProviderType;
  model: LLMModel;
  duration: number;
  error?: boolean;
  errorCategory?: string;
}

export const MODEL_TO_PROVIDER: Record<LLMModel, LLMProviderType> = {
  "gpt-5": "openai",
  "claude-sonnet-4-5": "anthropic",
  "claude-opus-4-5": "anthropic",
  "claude-haiku-4-5": "anthropic",
  "gemini-pro": "gemini",
};

export const MODEL_INFO: Record<
  LLMModel,
  { name: string; description: string; provider: LLMProviderType }
> = {
  "gpt-5": {
    name: "GPT-5",
    description: "OpenAI's most advanced model",
    provider: "openai",
  },
  "claude-sonnet-4-5": {
    name: "Claude Sonnet 4.5",
    description: "Balanced performance and speed",
    provider: "anthropic",
  },
  "claude-opus-4-5": {
    name: "Claude Opus 4.5",
    description: "Most capable for complex reasoning",
    provider: "anthropic",
  },
  "claude-haiku-4-5": {
    name: "Claude Haiku 4.5",
    description: "Fastest and most compact",
    provider: "anthropic",
  },
  "gemini-pro": {
    name: "Gemini Pro",
    description: "Google's multimodal AI model",
    provider: "gemini",
  },
};
