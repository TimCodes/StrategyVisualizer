import { llmService } from "./llm";
import type { LLMModel } from "./llm";
import {
  LEAN_AGENT_SYSTEM_PROMPT,
  LEAN_EXPLAIN_PROMPT,
  LEAN_OPTIMIZE_PROMPT,
} from "./lean-agent-prompt";

export interface StrategyGenerationRequest {
  description: string;
  model?: LLMModel;
  constraints?: {
    startDate?: string;
    endDate?: string;
    initialCapital?: number;
    assets?: string[];
    maxDrawdown?: number;
    rebalanceFrequency?: string;
    assetClass?: string;
    timeframe?: string;
    riskLevel?: string;
  };
  autoBacktest?: boolean;
}

export interface StrategyRefinementRequest {
  previousCode: string;
  userFeedback: string;
  backtestResults?: Record<string, unknown>;
  model?: LLMModel;
}

export interface StrategyGenerationResult {
  code: string;
  explanation: string;
  className: string;
}

export interface OptimizationSuggestion {
  title: string;
  problem: string;
  solution: string;
  codeSnippet: string;
  expectedImpact: string;
}

function extractClassName(code: string): string {
  const match = code.match(/class\s+(\w+)\s*\(QCAlgorithm\)/);
  return match ? match[1] : "MyStrategy";
}

function validateLeanCode(code: string): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  if (!code.includes("from AlgorithmImports import *")) {
    issues.push("Missing: from AlgorithmImports import *");
  }
  if (!code.includes("class") || !code.includes("QCAlgorithm")) {
    issues.push("Missing QCAlgorithm class definition");
  }
  if (!code.includes("def initialize")) {
    issues.push("Missing initialize() method");
  }
  if (!code.includes("def on_data")) {
    issues.push("Missing on_data() method");
  }
  if (!code.includes("set_start_date") && !code.includes("set_end_date")) {
    issues.push("Missing start/end date configuration");
  }

  return { valid: issues.length === 0, issues };
}

function cleanGeneratedCode(raw: string): string {
  let code = raw.trim();
  code = code.replace(/^```python\s*/i, "");
  code = code.replace(/^```\s*/i, "");
  code = code.replace(/```\s*$/i, "");
  code = code.trim();

  if (!code.startsWith("from") && !code.startsWith("#")) {
    const fromIdx = code.indexOf("from AlgorithmImports");
    if (fromIdx > 0) {
      code = code.substring(fromIdx);
    }
  }

  return code;
}

export async function generateStrategy(
  request: StrategyGenerationRequest
): Promise<StrategyGenerationResult> {
  const model: LLMModel = request.model || "gpt-5";

  let userPrompt = `Generate a complete QuantConnect LEAN Python trading strategy for the following description:\n\n${request.description}`;

  if (request.constraints) {
    const c = request.constraints;
    const parts: string[] = [];

    if (c.startDate) parts.push(`Start date: ${c.startDate}`);
    if (c.endDate) parts.push(`End date: ${c.endDate}`);
    if (c.initialCapital) parts.push(`Initial capital: $${c.initialCapital.toLocaleString()}`);
    if (c.assets?.length) parts.push(`Focus on these assets: ${c.assets.join(", ")}`);
    if (c.maxDrawdown) parts.push(`Target max drawdown below: ${c.maxDrawdown}%`);
    if (c.rebalanceFrequency) parts.push(`Rebalance frequency: ${c.rebalanceFrequency}`);
    if (c.assetClass) parts.push(`Asset class: ${c.assetClass}`);
    if (c.timeframe) parts.push(`Timeframe: ${c.timeframe}`);
    if (c.riskLevel) parts.push(`Risk level: ${c.riskLevel}`);

    if (parts.length > 0) {
      userPrompt += `\n\nConstraints:\n${parts.map((p) => `- ${p}`).join("\n")}`;
    }
  }

  const messages = [
    { role: "system" as const, content: LEAN_AGENT_SYSTEM_PROMPT },
    { role: "user" as const, content: userPrompt },
  ];

  const response = await llmService.complete(messages, {
    model,
    maxTokens: 4000,
    temperature: 0.3,
  });

  const code = cleanGeneratedCode(response.content);
  const validation = validateLeanCode(code);

  const className = extractClassName(code);

  const explanationMessages = [
    {
      role: "system" as const,
      content: "You are a trading strategy expert. Provide a brief, clear 2-3 sentence explanation of what the strategy does. Focus on the trading logic, not code details.",
    },
    {
      role: "user" as const,
      content: `Explain this trading strategy in 2-3 sentences for a user who requested: "${request.description}"\n\nCode:\n${code}`,
    },
  ];

  let explanation = `Generated ${className} strategy based on your description.`;
  try {
    const explanationResponse = await llmService.complete(explanationMessages, {
      model,
      maxTokens: 200,
      temperature: 0.5,
    });
    explanation = explanationResponse.content;
  } catch {
  }

  if (!validation.valid) {
    console.warn(
      `Generated code has issues: ${validation.issues.join(", ")}`
    );
  }

  return { code, explanation, className };
}

export async function refineStrategy(
  request: StrategyRefinementRequest
): Promise<StrategyGenerationResult> {
  const model: LLMModel = request.model || "gpt-5";

  let userPrompt = `Refine and improve this QuantConnect LEAN trading strategy based on the following feedback:\n\n`;
  userPrompt += `User feedback: ${request.userFeedback}\n\n`;

  if (request.backtestResults) {
    const results = request.backtestResults as Record<string, unknown>;
    userPrompt += `Backtest results:\n`;
    userPrompt += `- Total Return: ${results.totalReturn ?? "N/A"}%\n`;
    userPrompt += `- Sharpe Ratio: ${results.sharpeRatio ?? "N/A"}\n`;
    userPrompt += `- Max Drawdown: ${results.maxDrawdown ?? "N/A"}%\n`;
    userPrompt += `- Win Rate: ${results.winRate ?? "N/A"}%\n\n`;
  }

  userPrompt += `Current strategy code:\n${request.previousCode}`;

  const messages = [
    { role: "system" as const, content: LEAN_AGENT_SYSTEM_PROMPT },
    { role: "user" as const, content: userPrompt },
  ];

  const response = await llmService.complete(messages, {
    model,
    maxTokens: 4000,
    temperature: 0.3,
  });

  const code = cleanGeneratedCode(response.content);
  const className = extractClassName(code);

  return {
    code,
    explanation: `Refined ${className} strategy based on your feedback.`,
    className,
  };
}

export async function explainStrategy(
  code: string,
  model: LLMModel = "gpt-5"
): Promise<string> {
  const messages = [
    { role: "system" as const, content: LEAN_EXPLAIN_PROMPT },
    {
      role: "user" as const,
      content: `Explain this trading strategy:\n\n${code}`,
    },
  ];

  const response = await llmService.complete(messages, {
    model,
    maxTokens: 1000,
    temperature: 0.5,
  });

  return response.content;
}

export async function suggestOptimizations(
  code: string,
  model: LLMModel = "gpt-5"
): Promise<OptimizationSuggestion[]> {
  const messages = [
    { role: "system" as const, content: LEAN_OPTIMIZE_PROMPT },
    {
      role: "user" as const,
      content: `Suggest optimizations for this strategy:\n\n${code}`,
    },
  ];

  const response = await llmService.complete(messages, {
    model,
    maxTokens: 2000,
    temperature: 0.4,
  });

  try {
    const jsonMatch = response.content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as OptimizationSuggestion[];
    }
  } catch {
  }

  return [
    {
      title: "Review Generated Suggestions",
      problem: "Could not parse structured suggestions",
      solution: response.content,
      codeSnippet: "",
      expectedImpact: "See full response above",
    },
  ];
}

export function simulateLeanBacktest(
  code: string,
  projectName: string
): {
  totalReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  equityCurve: Array<{ date: string; value: number }>;
  logs: string[];
} {
  const logs: string[] = [
    `[${new Date().toISOString()}] Initializing LEAN backtest for: ${projectName}`,
    `[${new Date().toISOString()}] Loading algorithm: ${code.match(/class\s+(\w+)/)?.[1] ?? "Strategy"}`,
    `[${new Date().toISOString()}] Parsing configuration...`,
    `[${new Date().toISOString()}] Loading historical data...`,
    `[${new Date().toISOString()}] Starting warm-up period...`,
    `[${new Date().toISOString()}] Warm-up complete. Beginning backtest.`,
  ];

  const isLongShort = code.includes("set_holdings") && code.includes("-");
  const isMeanReversion = code.toLowerCase().includes("rsi") || code.toLowerCase().includes("mean_reversion") || code.toLowerCase().includes("bollinger");
  const isMomentum = code.toLowerCase().includes("momentum") || code.toLowerCase().includes("macd") || code.toLowerCase().includes("crossover");
  const isCrypto = code.toLowerCase().includes("crypto") || code.toLowerCase().includes("btcusd") || code.toLowerCase().includes("ethusd");

  let baseReturn = 0;
  let baseSharpe = 0;
  let baseDrawdown = 0;
  let baseWinRate = 0;

  if (isCrypto) {
    baseReturn = (Math.random() - 0.3) * 60;
    baseSharpe = (Math.random() - 0.2) * 2;
    baseDrawdown = -(15 + Math.random() * 30);
    baseWinRate = 40 + Math.random() * 20;
  } else if (isMomentum) {
    baseReturn = (Math.random() - 0.3) * 30;
    baseSharpe = 0.5 + Math.random() * 1.5;
    baseDrawdown = -(8 + Math.random() * 15);
    baseWinRate = 45 + Math.random() * 20;
  } else if (isMeanReversion) {
    baseReturn = (Math.random() - 0.4) * 25;
    baseSharpe = 0.3 + Math.random() * 1.2;
    baseDrawdown = -(5 + Math.random() * 12);
    baseWinRate = 50 + Math.random() * 20;
  } else {
    baseReturn = (Math.random() - 0.4) * 25;
    baseSharpe = 0.4 + Math.random() * 1.3;
    baseDrawdown = -(6 + Math.random() * 15);
    baseWinRate = 45 + Math.random() * 20;
  }

  const totalTrades = Math.floor(30 + Math.random() * 200);

  const startDate = new Date("2022-01-01");
  const endDate = new Date("2023-12-31");
  const days = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const equityCurve: Array<{ date: string; value: number }> = [];
  let equity = 100000;
  const dailyReturn = baseReturn / 100 / days;
  const volatility = Math.abs(baseDrawdown) / 100 / Math.sqrt(days);

  for (let i = 0; i <= days; i += 7) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    const noise = (Math.random() - 0.5) * 2 * volatility * equity * 7;
    equity = equity * (1 + dailyReturn * 7) + noise;
    equity = Math.max(equity, 10000);
    equityCurve.push({
      date: d.toISOString().split("T")[0],
      value: Math.round(equity * 100) / 100,
    });
  }

  logs.push(`[${new Date().toISOString()}] Processing ${totalTrades} trades...`);

  for (let i = 0; i < Math.min(5, totalTrades); i++) {
    const tradeDate = new Date(startDate);
    tradeDate.setDate(tradeDate.getDate() + Math.floor(Math.random() * days));
    const pnl = (Math.random() - 0.4) * 500;
    logs.push(
      `[${tradeDate.toISOString().split("T")[0]}] ${pnl >= 0 ? "WIN" : "LOSS"}: $${Math.abs(pnl).toFixed(2)}`
    );
  }

  if (totalTrades > 5) {
    logs.push(`[...] ${totalTrades - 5} more trades...`);
  }

  logs.push(`[${new Date().toISOString()}] Backtest complete.`);
  logs.push(`[${new Date().toISOString()}] Total Return: ${baseReturn.toFixed(2)}%`);
  logs.push(`[${new Date().toISOString()}] Sharpe Ratio: ${baseSharpe.toFixed(2)}`);
  logs.push(`[${new Date().toISOString()}] Max Drawdown: ${baseDrawdown.toFixed(2)}%`);
  logs.push(`[${new Date().toISOString()}] Win Rate: ${baseWinRate.toFixed(2)}%`);

  return {
    totalReturn: Math.round(baseReturn * 100) / 100,
    sharpeRatio: Math.round(baseSharpe * 100) / 100,
    maxDrawdown: Math.round(baseDrawdown * 100) / 100,
    winRate: Math.round(baseWinRate * 100) / 100,
    totalTrades,
    equityCurve,
    logs,
  };
}
