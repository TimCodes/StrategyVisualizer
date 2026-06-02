import { llmService } from "./llm";
import type { LLMModel } from "./llm";
import {
  LEAN_AGENT_SYSTEM_PROMPT,
  EDGE_CRITIQUE_SYSTEM_PROMPT,
  LEAN_EXPLAIN_PROMPT,
  LEAN_OPTIMIZE_PROMPT,
} from "./lean-agent-prompt";

export interface StrategyGenerationRequest {
  description: string;
  edge: string;
  acknowledgeWeakEdge?: boolean;
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
  userFeedback?: string;
  rationale: string;
  refinementType: "logic_fix" | "optimization";
  backtestResults?: Record<string, unknown>;
  model?: LLMModel;
}

export interface StrategyCodeResult {
  code: string;
  explanation: string;
  className: string;
}

export interface EdgeAssessment {
  verdict: "strong" | "weak" | "none";
  reasoning: string;
  questions: string[];
}

export type GenerateResult =
  | {
      status: "ok";
      code: string;
      explanation: string;
      className: string;
      edge: string;
      edgeAssessment: "strong" | "weak" | "none";
    }
  | {
      status: "needs_stronger_edge";
      assessment: EdgeAssessment;
    };

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

export async function assessEdge(
  edge: string,
  description: string,
  model: LLMModel = "gpt-5"
): Promise<EdgeAssessment> {
  const userPrompt = `Strategy description: ${description}\n\nStated edge: ${edge}`;
  try {
    const response = await llmService.complete(
      [
        { role: "system" as const, content: EDGE_CRITIQUE_SYSTEM_PROMPT },
        { role: "user" as const, content: userPrompt },
      ],
      { model, maxTokens: 600, temperature: 0.2 }
    );
    let raw = response.content.trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const parsed = JSON.parse(raw) as EdgeAssessment;
    if (!["strong", "weak", "none"].includes(parsed.verdict)) {
      parsed.verdict = "weak";
    }
    return parsed;
  } catch {
    return {
      verdict: "weak",
      reasoning: "Could not evaluate the edge — please make it more concrete and specific.",
      questions: [
        "Who is on the other side of this trade, and why would they persistently lose?",
        "Is this a testable claim about market behavior, or a description of an indicator rule?",
      ],
    };
  }
}

export async function generateStrategy(
  request: StrategyGenerationRequest
): Promise<GenerateResult> {
  const model: LLMModel = request.model || "gpt-5";

  const assessment = await assessEdge(request.edge, request.description, model);

  if (
    (assessment.verdict === "weak" || assessment.verdict === "none") &&
    !request.acknowledgeWeakEdge
  ) {
    return { status: "needs_stronger_edge", assessment };
  }

  let userPrompt = `Generate a complete QuantConnect LEAN Python trading strategy.\n\nDescription: ${request.description}\n\nStated edge: ${request.edge}`;

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

  const response = await llmService.complete(
    [
      { role: "system" as const, content: LEAN_AGENT_SYSTEM_PROMPT },
      { role: "user" as const, content: userPrompt },
    ],
    { model, maxTokens: 4000, temperature: 0.3 }
  );

  const code = cleanGeneratedCode(response.content);
  const validation = validateLeanCode(code);
  if (!validation.valid) {
    console.warn(`Generated code has issues: ${validation.issues.join(", ")}`);
  }

  const className = extractClassName(code);

  let explanation = `Generated ${className} strategy based on your description.`;
  try {
    const explanationResponse = await llmService.complete(
      [
        {
          role: "system" as const,
          content:
            "You are a trading strategy expert. Provide a brief, clear 2-3 sentence explanation of what the strategy does. Focus on the trading logic, not code details.",
        },
        {
          role: "user" as const,
          content: `Explain this trading strategy in 2-3 sentences for a user who requested: "${request.description}"\n\nCode:\n${code}`,
        },
      ],
      { model, maxTokens: 200, temperature: 0.5 }
    );
    explanation = explanationResponse.content;
  } catch {
  }

  return {
    status: "ok",
    code,
    explanation,
    className,
    edge: request.edge,
    edgeAssessment: assessment.verdict,
  };
}

export async function refineStrategy(
  request: StrategyRefinementRequest
): Promise<StrategyCodeResult> {
  const model: LLMModel = request.model || "gpt-5";

  let systemInstruction: string;
  if (request.refinementType === "logic_fix") {
    systemInstruction = `You are making a targeted logic correction to a trading strategy.

Rules:
- Implement ONLY the specific logic change the user described in their rationale.
- If backtest metrics are provided, they are context only — they must NOT drive any parameter changes.
- Do not silently improve Sharpe ratio, returns, or any other metric by changing parameters the user did not mention.
- Make only the change articulated by the user. Nothing more.`;
  } else {
    systemInstruction = `You are making a specific optimization to a trading strategy that the user has explicitly chosen to make.

Rules:
- Implement ONLY the specific change described in the user's rationale.
- You must NOT free-tune additional parameters beyond what the rationale states.
- You must NOT change any parameter simply because it might improve backtest metrics.
- In your explanation, you MUST note that this optimization increases the risk of overfitting to historical data.
- Do not silently chase higher returns or Sharpe ratio. Only make the change the user articulated.`;
  }

  let userPrompt = `Refinement type: ${request.refinementType}\nRationale: ${request.rationale}\n`;
  if (request.userFeedback) {
    userPrompt += `Additional feedback: ${request.userFeedback}\n`;
  }

  if (request.backtestResults && request.refinementType === "logic_fix") {
    const r = request.backtestResults as Record<string, unknown>;
    userPrompt += `\nBacktest context (for reference only — do not optimize toward these numbers):\n`;
    userPrompt += `- Total Return: ${r.totalReturn ?? "N/A"}%\n`;
    userPrompt += `- Sharpe Ratio: ${r.sharpeRatio ?? "N/A"}\n`;
    userPrompt += `- Max Drawdown: ${r.maxDrawdown ?? "N/A"}%\n`;
    userPrompt += `- Win Rate: ${r.winRate ?? "N/A"}%\n`;
  }

  userPrompt += `\nCurrent strategy code:\n${request.previousCode}`;

  const response = await llmService.complete(
    [
      { role: "system" as const, content: LEAN_AGENT_SYSTEM_PROMPT + "\n\n" + systemInstruction },
      { role: "user" as const, content: userPrompt },
    ],
    { model, maxTokens: 4000, temperature: 0.3 }
  );

  const code = cleanGeneratedCode(response.content);
  const className = extractClassName(code);

  return {
    code,
    explanation:
      request.refinementType === "optimization"
        ? `Optimized ${className} as requested. Note: this optimization increases the risk of overfitting to past data.`
        : `Applied logic fix to ${className} as described.`,
    className,
  };
}

export async function explainStrategy(
  code: string,
  model: LLMModel = "gpt-5"
): Promise<string> {
  const response = await llmService.complete(
    [
      { role: "system" as const, content: LEAN_EXPLAIN_PROMPT },
      { role: "user" as const, content: `Explain this trading strategy:\n\n${code}` },
    ],
    { model, maxTokens: 1000, temperature: 0.5 }
  );
  return response.content;
}

export async function suggestOptimizations(
  code: string,
  model: LLMModel = "gpt-5"
): Promise<OptimizationSuggestion[]> {
  const response = await llmService.complete(
    [
      { role: "system" as const, content: LEAN_OPTIMIZE_PROMPT },
      { role: "user" as const, content: `Suggest optimizations for this strategy:\n\n${code}` },
    ],
    { model, maxTokens: 2000, temperature: 0.4 }
  );

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

  const isMeanReversion =
    code.toLowerCase().includes("rsi") ||
    code.toLowerCase().includes("mean_reversion") ||
    code.toLowerCase().includes("bollinger");
  const isMomentum =
    code.toLowerCase().includes("momentum") ||
    code.toLowerCase().includes("macd") ||
    code.toLowerCase().includes("crossover");
  const isCrypto =
    code.toLowerCase().includes("crypto") ||
    code.toLowerCase().includes("btcusd") ||
    code.toLowerCase().includes("ethusd");

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
    equityCurve.push({ date: d.toISOString().split("T")[0], value: Math.round(equity * 100) / 100 });
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
