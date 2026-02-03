import type { Express, Request, Response } from "express";
import { llmService } from "../services/llm";
import { storage } from "../storage";
import { parseSignal } from "../services/signalParser";
import { eventBus } from "../ws";
import { chatRequestSchema } from "@shared/schema";
import type { LLMModel } from "../services/llm/types";

const SYSTEM_PROMPT = `You are an expert AI trading assistant with deep knowledge of algorithmic trading, portfolio management, and market analysis. You have access to the user's real trading data and should provide personalized, actionable insights.

Guidelines:
- Provide specific, data-driven insights based on the user's portfolio and trading history
- Be concise but thorough in your analysis
- Suggest actionable improvements when appropriate
- Use precise numbers and percentages from the provided data
- When recommending trades, include: action (buy/sell), symbol, entry price, stop-loss, take-profit, and confidence level
- If asked about something not in the data, be honest about limitations
- Format responses with bullet points and clear structure when helpful`;

export function registerLLMRoutes(app: Express) {
  app.get("/api/llm/status", async (_req: Request, res: Response) => {
    try {
      const status = await llmService.getProviderStatus();
      res.json(status);
    } catch (error) {
      console.error("Error getting LLM status:", error);
      res.status(500).json({ error: "Failed to get LLM status" });
    }
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ 
          error: "Invalid request", 
          details: parsed.error.errors 
        });
      }

      const { message, provider, model, context, stream } = parsed.data;

      await storage.createChatMessage({ 
        role: "user", 
        content: message, 
        context,
        provider,
        model,
      });

      const chatHistory = await storage.getChatMessages();
      const recentMessages = chatHistory.slice(-10).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const contextPrompt = context 
        ? `\n\nCurrent Trading Context:\n${JSON.stringify(context, null, 2)}`
        : "";

      const messages = [
        { role: "system" as const, content: SYSTEM_PROMPT + contextPrompt },
        ...recentMessages,
      ];

      if (stream) {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        let fullResponse = "";

        for await (const { token, done } of llmService.stream(messages, {
          model: model as LLMModel,
          maxTokens: 1024,
        })) {
          fullResponse += token;
          res.write(`data: ${JSON.stringify({ token, done })}\n\n`);

          if (done) {
            const savedMessage = await storage.createChatMessage({
              role: "assistant",
              content: fullResponse,
              provider,
              model,
            });

            const signal = parseSignal(fullResponse, provider!, model!);
            if (signal) {
              eventBus.emit("signal:detected", signal);
              res.write(`data: ${JSON.stringify({ signal })}\n\n`);
            }

            res.write(`data: ${JSON.stringify({ 
              message: fullResponse, 
              id: savedMessage.id,
              provider,
              model,
              signal,
            })}\n\n`);
          }
        }

        res.end();
      } else {
        const response = await llmService.complete(messages, {
          model: model as LLMModel,
          maxTokens: 1024,
        });

        const savedMessage = await storage.createChatMessage({
          role: "assistant",
          content: response.content,
          provider: response.provider,
          model: response.model,
        });

        const signal = parseSignal(response.content, response.provider, response.model);
        if (signal) {
          eventBus.emit("signal:detected", signal);
        }

        res.json({
          message: response.content,
          id: savedMessage.id,
          provider: response.provider,
          model: response.model,
          duration: response.duration,
          signal,
        });
      }
    } catch (error) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });

  app.post("/api/arena/compare", async (req: Request, res: Response) => {
    try {
      const { message, models, context } = req.body;

      if (!message || !Array.isArray(models) || models.length === 0) {
        return res.status(400).json({ 
          error: "Message and models array required" 
        });
      }

      const contextPrompt = context
        ? `\n\nCurrent Trading Context:\n${JSON.stringify(context, null, 2)}`
        : "";

      const messages = [
        { role: "system" as const, content: SYSTEM_PROMPT + contextPrompt },
        { role: "user" as const, content: message },
      ];

      const results = await llmService.compareModels(
        messages,
        models as LLMModel[],
        { maxTokens: 1024 }
      );

      const resultsWithSignals = results.map((result) => {
        const signal = parseSignal(result.content, result.provider, result.model);
        return { ...result, signal };
      });

      res.json({ results: resultsWithSignals });
    } catch (error) {
      console.error("Arena compare error:", error);
      res.status(500).json({ error: "Failed to compare models" });
    }
  });

  app.get("/api/chat/messages", async (_req: Request, res: Response) => {
    try {
      const messages = await storage.getChatMessages();
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  app.delete("/api/chat/messages", async (_req: Request, res: Response) => {
    try {
      await storage.clearChatHistory();
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });
}
