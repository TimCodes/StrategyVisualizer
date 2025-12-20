import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import OpenAI from "openai";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
let openai: OpenAI | null = null;

function getOpenAI(): OpenAI {
  if (!openai) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openai;
}

export function registerChatRoutes(app: Express) {
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

  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { message, context } = req.body;
      
      if (!message || typeof message !== "string") {
        return res.status(400).json({ error: "Message is required" });
      }

      await storage.createChatMessage({ role: "user", content: message, context });

      const chatHistory = await storage.getChatMessages();
      const recentMessages = chatHistory.slice(-10).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));

      const systemPrompt = `You are an expert AI trading assistant with deep knowledge of algorithmic trading, portfolio management, and market analysis. You have access to the user's real trading data and should provide personalized, actionable insights.

Current Trading Context:
${context ? JSON.stringify(context, null, 2) : "No context available"}

Guidelines:
- Provide specific, data-driven insights based on the user's portfolio and trading history
- Be concise but thorough in your analysis
- Suggest actionable improvements when appropriate
- Use precise numbers and percentages from the provided data
- If asked about something not in the data, be honest about limitations
- Format responses with bullet points and clear structure when helpful`;

      const response = await getOpenAI().chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMessages
        ],
        max_completion_tokens: 1024,
      });

      const aiMessage = response.choices[0]?.message?.content || "I apologize, but I couldn't generate a response. Please try again.";
      
      const savedMessage = await storage.createChatMessage({ role: "assistant", content: aiMessage });
      
      res.json({ message: aiMessage, id: savedMessage.id });
    } catch (error) {
      console.error("Chat API error:", error);
      res.status(500).json({ error: "Failed to get AI response" });
    }
  });
}
