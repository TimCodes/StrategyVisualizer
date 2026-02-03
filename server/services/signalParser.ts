import { z } from "zod";
import type { LLMProviderType, LLMModel } from "./llm/types";

export const tradeSignalSchema = z.object({
  action: z.enum(["buy", "sell", "hold"]),
  symbol: z.string(),
  confidence: z.number().min(0).max(100),
  entryPrice: z.number().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  reasoning: z.string().optional(),
  provider: z.enum(["openai", "anthropic", "gemini"]),
  model: z.string(),
  timestamp: z.date(),
  id: z.string(),
});

export type TradeSignal = z.infer<typeof tradeSignalSchema>;

const SIGNAL_PATTERNS = {
  buy: /\b(buy|long|bullish|accumulate|enter\s+long|go\s+long)\b/i,
  sell: /\b(sell|short|bearish|exit|close|take\s+profit)\b/i,
  hold: /\b(hold|wait|neutral|sidelines|no\s+action)\b/i,
  symbols: /\b(BTC|ETH|SOL|ADA|XRP|DOGE|AVAX|DOT|LINK|MATIC)(?:\/USD|\/USDT)?\b/gi,
  price: /\$?([\d,]+(?:\.\d{1,2})?)/g,
  confidence: /(\d{1,3})%?\s*(?:confidence|certain|likely|probability|sure)/i,
  stopLoss: /stop[\s-]?loss[:\s]+\$?([\d,]+(?:\.\d{1,2})?)/i,
  takeProfit: /take[\s-]?profit[:\s]+\$?([\d,]+(?:\.\d{1,2})?)|target[:\s]+\$?([\d,]+(?:\.\d{1,2})?)/i,
  entry: /entry[:\s]+\$?([\d,]+(?:\.\d{1,2})?)|enter\s+(?:at|around)\s+\$?([\d,]+(?:\.\d{1,2})?)/i,
};

function extractAction(text: string): "buy" | "sell" | "hold" | null {
  const buyMatch = text.match(SIGNAL_PATTERNS.buy);
  const sellMatch = text.match(SIGNAL_PATTERNS.sell);
  const holdMatch = text.match(SIGNAL_PATTERNS.hold);

  const buyIndex = buyMatch ? text.indexOf(buyMatch[0]) : Infinity;
  const sellIndex = sellMatch ? text.indexOf(sellMatch[0]) : Infinity;
  const holdIndex = holdMatch ? text.indexOf(holdMatch[0]) : Infinity;

  const minIndex = Math.min(buyIndex, sellIndex, holdIndex);
  if (minIndex === Infinity) return null;

  if (minIndex === buyIndex) return "buy";
  if (minIndex === sellIndex) return "sell";
  return "hold";
}

function extractSymbol(text: string): string | null {
  const matches = text.match(SIGNAL_PATTERNS.symbols);
  if (!matches || matches.length === 0) return null;

  const symbol = matches[0].toUpperCase();
  return symbol.includes("/") ? symbol : `${symbol}/USD`;
}

function extractPrice(text: string, pattern: RegExp): number | undefined {
  const match = text.match(pattern);
  if (!match) return undefined;

  const priceStr = match[1] || match[2];
  if (!priceStr) return undefined;

  return parseFloat(priceStr.replace(/,/g, ""));
}

function extractConfidence(text: string): number {
  const match = text.match(SIGNAL_PATTERNS.confidence);
  if (match) {
    const value = parseInt(match[1], 10);
    return Math.min(100, Math.max(0, value));
  }

  const action = extractAction(text);
  if (!action || action === "hold") return 50;

  const strongIndicators = /\b(strong|clear|definite|certain|confident|high probability)\b/i;
  const weakIndicators = /\b(possible|might|could|uncertain|risky|speculative)\b/i;

  if (strongIndicators.test(text)) return 75;
  if (weakIndicators.test(text)) return 40;

  return 60;
}

function extractReasoning(text: string, action: string): string {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 20);

  const relevantSentences = sentences.filter(
    (s) =>
      s.toLowerCase().includes(action) ||
      /\b(because|due to|based on|indicator|support|resistance|momentum|trend)\b/i.test(s)
  );

  if (relevantSentences.length > 0) {
    return relevantSentences.slice(0, 2).join(". ").trim() + ".";
  }

  return sentences.slice(0, 2).join(". ").trim() + ".";
}

export function parseSignal(
  text: string,
  provider: LLMProviderType,
  model: LLMModel
): TradeSignal | null {
  const action = extractAction(text);
  if (!action) return null;

  const symbol = extractSymbol(text);
  if (!symbol) return null;

  const confidence = extractConfidence(text);
  const entryPrice = extractPrice(text, SIGNAL_PATTERNS.entry);
  const stopLoss = extractPrice(text, SIGNAL_PATTERNS.stopLoss);
  const takeProfit = extractPrice(text, SIGNAL_PATTERNS.takeProfit);
  const reasoning = extractReasoning(text, action);

  return {
    id: `signal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    action,
    symbol,
    confidence,
    entryPrice,
    stopLoss,
    takeProfit,
    reasoning,
    provider,
    model,
    timestamp: new Date(),
  };
}

export function parseAllSignals(
  text: string,
  provider: LLMProviderType,
  model: LLMModel
): TradeSignal[] {
  const signals: TradeSignal[] = [];
  const paragraphs = text.split(/\n\n+/);

  for (const paragraph of paragraphs) {
    const signal = parseSignal(paragraph, provider, model);
    if (signal) {
      signals.push(signal);
    }
  }

  if (signals.length === 0) {
    const signal = parseSignal(text, provider, model);
    if (signal) {
      signals.push(signal);
    }
  }

  return signals;
}
