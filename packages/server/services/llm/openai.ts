import OpenAI from "openai";
import type {
  LLMProvider,
  Message,
  CompletionOptions,
  StreamToken,
} from "./types";

let openaiClient: OpenAI | null = null;

function getClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export class OpenAIProvider implements LLMProvider {
  name = "openai" as const;

  async complete(
    messages: Message[],
    options: CompletionOptions
  ): Promise<string> {
    const client = getClient();

    const response = await client.chat.completions.create({
      model: options.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_completion_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
    });

    return (
      response.choices[0]?.message?.content ||
      "No response generated"
    );
  }

  async *stream(
    messages: Message[],
    options: CompletionOptions
  ): AsyncIterable<StreamToken> {
    const client = getClient();

    const stream = await client.chat.completions.create({
      model: options.model,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
      max_completion_tokens: options.maxTokens || 1024,
      temperature: options.temperature || 0.7,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || "";
      const done = chunk.choices[0]?.finish_reason === "stop";
      if (content || done) {
        yield { token: content, done };
      }
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.OPENAI_API_KEY;
  }
}
