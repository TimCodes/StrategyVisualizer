import { GoogleGenerativeAI } from "@google/generative-ai";
import type {
  LLMProvider,
  Message,
  CompletionOptions,
  StreamToken,
} from "./types";

let geminiClient: GoogleGenerativeAI | null = null;

function getClient(): GoogleGenerativeAI {
  if (!geminiClient) {
    geminiClient = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY || "");
  }
  return geminiClient;
}

export class GeminiProvider implements LLMProvider {
  name = "gemini" as const;

  async complete(
    messages: Message[],
    options: CompletionOptions
  ): Promise<string> {
    const client = getClient();
    const model = client.getGenerativeModel({ model: "gemini-1.5-pro" });

    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const history = chatMessages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = chatMessages[chatMessages.length - 1];

    const chat = model.startChat({
      history: history as any,
      generationConfig: {
        maxOutputTokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.7,
      },
      systemInstruction: systemMessage?.content || options.systemPrompt,
    });

    const result = await chat.sendMessage(lastMessage?.content || "");
    return result.response.text();
  }

  async *stream(
    messages: Message[],
    options: CompletionOptions
  ): AsyncIterable<StreamToken> {
    const client = getClient();
    const model = client.getGenerativeModel({ model: "gemini-1.5-pro" });

    const systemMessage = messages.find((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    const history = chatMessages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const lastMessage = chatMessages[chatMessages.length - 1];

    const chat = model.startChat({
      history: history as any,
      generationConfig: {
        maxOutputTokens: options.maxTokens || 1024,
        temperature: options.temperature || 0.7,
      },
      systemInstruction: systemMessage?.content || options.systemPrompt,
    });

    const result = await chat.sendMessageStream(lastMessage?.content || "");

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        yield { token: text, done: false };
      }
    }
    yield { token: "", done: true };
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.GOOGLE_API_KEY;
  }
}
