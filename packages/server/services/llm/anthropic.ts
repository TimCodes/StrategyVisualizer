import Anthropic from "@anthropic-ai/sdk";
import type {
  LLMProvider,
  Message,
  CompletionOptions,
  StreamToken,
} from "./types";

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return anthropicClient;
}

function mapModel(model: string): string {
  const modelMap: Record<string, string> = {
    "claude-sonnet-4-5": "claude-sonnet-4-5-20250514",
    "claude-opus-4-5": "claude-opus-4-5-20250514",
    "claude-haiku-4-5": "claude-haiku-4-5-20250514",
  };
  return modelMap[model] || model;
}

export class AnthropicProvider implements LLMProvider {
  name = "anthropic" as const;

  async complete(
    messages: Message[],
    options: CompletionOptions
  ): Promise<string> {
    const client = getClient();

    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const response = await client.messages.create({
      model: mapModel(options.model),
      max_tokens: options.maxTokens || 1024,
      system: systemMessage?.content || options.systemPrompt,
      messages: userMessages,
    });

    const textBlock = response.content.find((block) => block.type === "text");
    return textBlock?.type === "text" ? textBlock.text : "No response generated";
  }

  async *stream(
    messages: Message[],
    options: CompletionOptions
  ): AsyncIterable<StreamToken> {
    const client = getClient();

    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

    const stream = client.messages.stream({
      model: mapModel(options.model),
      max_tokens: options.maxTokens || 1024,
      system: systemMessage?.content || options.systemPrompt,
      messages: userMessages,
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield { token: event.delta.text, done: false };
      }
      if (event.type === "message_stop") {
        yield { token: "", done: true };
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.ANTHROPIC_API_KEY;
  }
}
