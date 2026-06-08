import { useState } from "react";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { parseLLMError } from "@/lib/llmError";

interface StrategyAgentProps {
  open: boolean;
  onClose: () => void;
  onUseCode: (code: string) => void;
  currentCode?: string;
}

interface CodeResult {
  code: string;
  explanation: string;
  className: string;
}

interface EdgeAssessment {
  verdict: "strong" | "weak" | "none";
  reasoning: string;
  questions: string[];
}

interface GenerateOkResult extends CodeResult {
  status: "ok";
  edge: string;
  edgeAssessment: "strong" | "weak" | "none";
}

interface NeedsEdgeResult {
  status: "needs_stronger_edge";
  assessment: EdgeAssessment;
}

interface ConfirmOptimizationResult {
  status: "confirm_optimization";
  trialCount: number;
  warning: string;
}

type GenerateResponse = GenerateOkResult | NeedsEdgeResult;
type RefineResponse = CodeResult | ConfirmOptimizationResult;

const ASSET_CLASSES = [
  "Equities (US Stocks/ETFs)",
  "Crypto",
  "Forex",
  "Multi-Asset",
  "Options",
  "Futures",
];
const TIMEFRAMES = ["Daily", "Hourly", "Minute", "Weekly", "Monthly"];
const RISK_LEVELS = ["Conservative", "Moderate", "Aggressive"];
const REBALANCE_FREQUENCIES = ["Daily", "Weekly", "Monthly", "Quarterly", "On Signal"];

function EdgeVerdictBadge({ verdict }: { verdict: "strong" | "weak" | "none" }) {
  if (verdict === "strong")
    return (
      <Badge className="gap-1 bg-green-500/20 text-green-400 border-green-500/30 text-xs">
        <CheckCircle2 className="h-3 w-3" /> Strong Edge
      </Badge>
    );
  if (verdict === "weak")
    return (
      <Badge className="gap-1 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
        <AlertTriangle className="h-3 w-3" /> Weak Edge (override)
      </Badge>
    );
  return (
    <Badge className="gap-1 bg-red-500/20 text-red-400 border-red-500/30 text-xs">
      <XCircle className="h-3 w-3" /> No Edge (override)
    </Badge>
  );
}

export function StrategyAgent({
  open,
  onClose,
  onUseCode,
  currentCode,
}: StrategyAgentProps) {
  const [mode, setMode] = useState<"generate" | "refine" | "explain" | "optimize">("generate");

  // Generate state
  const [description, setDescription] = useState("");
  const [edge, setEdge] = useState("");
  const [assetClass, setAssetClass] = useState("Equities (US Stocks/ETFs)");
  const [timeframe, setTimeframe] = useState("Daily");
  const [riskLevel, setRiskLevel] = useState("Moderate");
  const [initialCapital, setInitialCapital] = useState("100000");
  const [rebalanceFreq, setRebalanceFreq] = useState("On Signal");
  const [edgeCritique, setEdgeCritique] = useState<NeedsEdgeResult | null>(null);

  // Refine state
  const [refinementType, setRefinementType] = useState<"logic_fix" | "optimization" | "">("");
  const [rationale, setRationale] = useState("");
  const [confirmData, setConfirmData] = useState<ConfirmOptimizationResult | null>(null);
  const [pendingRefinePayload, setPendingRefinePayload] = useState<Record<string, unknown> | null>(null);

  // Shared state
  const [codeResult, setCodeResult] = useState<CodeResult | null>(null);
  const [generatedEdgeAssessment, setGeneratedEdgeAssessment] = useState<"strong" | "weak" | "none" | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async (acknowledgeWeakEdge = false) => {
    if (!description.trim()) {
      toast({ title: "Please describe your strategy", variant: "destructive" });
      return;
    }
    if (edge.trim().length < 20) {
      toast({ title: "Edge too short", description: "Describe the market mechanism in at least 20 characters.", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setCodeResult(null);
    setEdgeCritique(null);
    setGeneratedEdgeAssessment(null);
    setExplanation(null);
    setSuggestions(null);

    try {
      const res = await apiRequest("POST", "/api/lean/agent/generate", {
        description,
        edge,
        acknowledgeWeakEdge: acknowledgeWeakEdge || undefined,
        model: "gpt-5",
        constraints: {
          initialCapital: parseInt(initialCapital) || 100000,
          assetClass,
          timeframe,
          riskLevel,
          rebalanceFrequency: rebalanceFreq,
        },
      });
      const data = (await res.json()) as GenerateResponse;

      if (data.status === "needs_stronger_edge") {
        setEdgeCritique(data);
      } else if (data.status === "ok") {
        setCodeResult({ code: data.code, explanation: data.explanation, className: data.className });
        setGeneratedEdgeAssessment(data.edgeAssessment);
      }
    } catch (err) {
      toast({
        title: "Generation failed",
        description: parseLLMError(err) ?? "Check your OpenAI API key in Settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefineSubmit = async (payload: Record<string, unknown>) => {
    setIsLoading(true);
    setCodeResult(null);
    setConfirmData(null);

    try {
      const res = await apiRequest("POST", "/api/lean/agent/refine", payload);
      const data = (await res.json()) as RefineResponse;

      if ("status" in data && data.status === "confirm_optimization") {
        setConfirmData(data as ConfirmOptimizationResult);
        setPendingRefinePayload(payload);
      } else {
        setCodeResult(data as CodeResult);
        setPendingRefinePayload(null);
      }
    } catch (err) {
      toast({
        title: "Refinement failed",
        description: parseLLMError(err) ?? "Could not refine the strategy.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = () => {
    if (!currentCode) {
      toast({ title: "No code to refine", variant: "destructive" });
      return;
    }
    if (!refinementType) {
      toast({ title: "Choose a refinement type", variant: "destructive" });
      return;
    }
    if (rationale.trim().length < 15) {
      toast({ title: "Rationale too short", description: "Explain your reason in at least 15 characters.", variant: "destructive" });
      return;
    }
    handleRefineSubmit({
      previousCode: currentCode,
      rationale,
      refinementType,
      model: "gpt-5",
    });
  };

  const handleConfirmOptimization = () => {
    if (!pendingRefinePayload) return;
    handleRefineSubmit({ ...pendingRefinePayload, confirmedOptimization: true });
  };

  const handleExplain = async () => {
    const code = currentCode || codeResult?.code;
    if (!code) {
      toast({ title: "No code to explain", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setExplanation(null);
    try {
      const res = await apiRequest("POST", "/api/lean/agent/explain", { code, model: "gpt-5" });
      const data = await res.json();
      setExplanation(data.explanation);
    } catch (err) {
      toast({
        title: "Explanation failed",
        description: parseLLMError(err) ?? "Could not explain the strategy.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimize = async () => {
    const code = currentCode || codeResult?.code;
    if (!code) {
      toast({ title: "No code to optimize", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setSuggestions(null);
    try {
      const res = await apiRequest("POST", "/api/lean/agent/optimize", { code, model: "gpt-5" });
      const data = await res.json();
      if (Array.isArray(data.suggestions)) {
        setSuggestions(
          data.suggestions
            .map((s: { title: string; solution: string }) => `• ${s.title}: ${s.solution}`)
            .join("\n\n")
        );
      } else {
        setSuggestions(JSON.stringify(data.suggestions, null, 2));
      }
    } catch (err) {
      toast({
        title: "Optimization failed",
        description: parseLLMError(err) ?? "Could not suggest optimizations.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (!codeResult?.code) return;
    navigator.clipboard.writeText(codeResult.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUse = () => {
    if (codeResult?.code) {
      onUseCode(codeResult.code);
      onClose();
    }
  };

  const canGenerate = description.trim().length >= 5 && edge.trim().length >= 20;
  const canRefine = !!currentCode && !!refinementType && rationale.trim().length >= 15;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl flex flex-col p-0">
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Strategy Agent
          </SheetTitle>
        </SheetHeader>

        <div className="flex gap-1 p-4 pb-0">
          {(["generate", "refine", "explain", "optimize"] as const).map((m) => (
            <Button
              key={m}
              variant={mode === m ? "default" : "ghost"}
              size="sm"
              onClick={() => setMode(m)}
              className="capitalize text-xs"
            >
              {m}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {/* ── GENERATE MODE ── */}
            {mode === "generate" && (
              <>
                <div className="space-y-1.5">
                  <Label>Strategy Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. A momentum strategy that rotates monthly into the top 3 performing S&P 500 sector ETFs based on 6-month returns, with a 10% max drawdown stop..."
                    rows={3}
                    className="resize-none text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    What's your edge?{" "}
                    <span className="text-red-400 text-xs">required</span>
                  </Label>
                  <Textarea
                    value={edge}
                    onChange={(e) => {
                      setEdge(e.target.value);
                      if (edgeCritique) setEdgeCritique(null);
                    }}
                    placeholder="Why should this work? Name the market behavior and who's on the other side. 'RSI crossed 30' is not an edge."
                    rows={3}
                    className="resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Describe the economic mechanism — who persistently loses on the other side
                    of this trade, and why?
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Asset Class</Label>
                    <Select value={assetClass} onValueChange={setAssetClass}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ASSET_CLASSES.map((a) => (
                          <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Timeframe</Label>
                    <Select value={timeframe} onValueChange={setTimeframe}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEFRAMES.map((t) => (
                          <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Risk Level</Label>
                    <Select value={riskLevel} onValueChange={setRiskLevel}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RISK_LEVELS.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Rebalance</Label>
                    <Select value={rebalanceFreq} onValueChange={setRebalanceFreq}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REBALANCE_FREQUENCIES.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5 col-span-2">
                    <Label className="text-xs">Initial Capital ($)</Label>
                    <Input
                      value={initialCapital}
                      onChange={(e) => setInitialCapital(e.target.value)}
                      type="number"
                      className="h-8 text-xs"
                    />
                  </div>
                </div>

                <Button
                  onClick={() => handleGenerate(false)}
                  disabled={isLoading || !canGenerate}
                  className="w-full gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isLoading ? "Evaluating edge..." : "Generate Strategy"}
                </Button>

                {/* Edge critique response */}
                {edgeCritique && (
                  <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-yellow-400 font-medium text-sm">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      Edge needs work
                      <Badge variant="outline" className="ml-auto text-xs border-yellow-500/40 text-yellow-400">
                        {edgeCritique.assessment.verdict === "none" ? "No edge found" : "Weak edge"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {edgeCritique.assessment.reasoning}
                    </p>
                    {edgeCritique.assessment.questions.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted-foreground">Questions to answer:</p>
                        <ul className="space-y-1">
                          {edgeCritique.assessment.questions.map((q, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex gap-2">
                              <span className="text-yellow-400 shrink-0">→</span>
                              {q}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => {
                          setEdgeCritique(null);
                          setEdge("");
                        }}
                      >
                        Revise my edge
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-muted-foreground"
                        onClick={() => handleGenerate(true)}
                        disabled={isLoading}
                      >
                        Generate anyway
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── REFINE MODE ── */}
            {mode === "refine" && (
              <>
                <div className="space-y-1.5">
                  <Label>Refinement Type <span className="text-red-400 text-xs">required</span></Label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setRefinementType("logic_fix"); setConfirmData(null); }}
                      className={`rounded-lg border p-3 text-left space-y-1 transition-colors ${
                        refinementType === "logic_fix"
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      <div className="text-xs font-medium">Logic Fix</div>
                      <div className="text-xs text-muted-foreground">Correct a specific flaw in the trading logic</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setRefinementType("optimization"); setConfirmData(null); }}
                      className={`rounded-lg border p-3 text-left space-y-1 transition-colors ${
                        refinementType === "optimization"
                          ? "border-orange-500/60 bg-orange-500/10"
                          : "border-border hover:border-muted-foreground/50"
                      }`}
                    >
                      <div className="text-xs font-medium flex items-center gap-1">
                        Optimization
                        <AlertTriangle className="h-3 w-3 text-orange-400" />
                      </div>
                      <div className="text-xs text-muted-foreground">Tune a parameter — increases overfitting risk</div>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    Why this change? <span className="text-red-400 text-xs">required</span>
                  </Label>
                  <Textarea
                    value={rationale}
                    onChange={(e) => setRationale(e.target.value)}
                    placeholder={
                      refinementType === "optimization"
                        ? "e.g. The 14-day RSI period is too sensitive to noise for daily data — I want to test 21 days specifically."
                        : "e.g. The strategy trades on warm-up bars because is_warming_up isn't checked in on_data — this needs to be fixed."
                    }
                    rows={4}
                    className="resize-none text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    Be specific. The AI will only make the change you describe here.
                  </p>
                </div>

                {!currentCode && (
                  <p className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                    No strategy loaded in editor. Open a project to refine its code.
                  </p>
                )}

                <Button
                  onClick={handleRefine}
                  disabled={isLoading || !canRefine}
                  className="w-full gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {isLoading ? "Applying..." : "Apply Refinement"}
                </Button>

                {/* Optimization confirmation gate */}
                {confirmData && (
                  <div className="rounded-lg border border-orange-500/50 bg-orange-500/5 p-4 space-y-3">
                    <div className="flex items-center gap-2 text-orange-400 font-medium text-sm">
                      <ShieldAlert className="h-4 w-4 shrink-0" />
                      Confirm optimization
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {confirmData.warning}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground bg-muted/30 rounded px-3 py-2">
                      <span>Prior trials on this strategy</span>
                      <span className="font-mono font-bold text-orange-400">{confirmData.trialCount}</span>
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 text-xs"
                        onClick={() => { setConfirmData(null); setPendingRefinePayload(null); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="flex-1 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                        onClick={handleConfirmOptimization}
                        disabled={isLoading}
                      >
                        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                        I understand — optimize
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ── EXPLAIN MODE ── */}
            {mode === "explain" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Get a plain-English explanation of the current strategy in the editor.
                </p>
                {!currentCode && !codeResult?.code && (
                  <p className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                    No strategy loaded. Open a project or generate one first.
                  </p>
                )}
                <Button
                  onClick={handleExplain}
                  disabled={isLoading || (!currentCode && !codeResult?.code)}
                  className="w-full gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isLoading ? "Explaining..." : "Explain Strategy"}
                </Button>
                {explanation && (
                  <div className="rounded-lg bg-card border border-border p-3 text-sm leading-relaxed whitespace-pre-wrap">
                    {explanation}
                  </div>
                )}
              </>
            )}

            {/* ── OPTIMIZE MODE ── */}
            {mode === "optimize" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered optimization suggestions for the current strategy.
                </p>
                {!currentCode && !codeResult?.code && (
                  <p className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                    No strategy loaded. Open a project or generate one first.
                  </p>
                )}
                <Button
                  onClick={handleOptimize}
                  disabled={isLoading || (!currentCode && !codeResult?.code)}
                  className="w-full gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isLoading ? "Analyzing..." : "Suggest Optimizations"}
                </Button>
                {suggestions && (
                  <div className="rounded-lg bg-card border border-border p-3 text-sm leading-relaxed whitespace-pre-wrap font-mono text-xs">
                    {suggestions}
                  </div>
                )}
              </>
            )}

            {/* ── CODE RESULT (generate + refine) ── */}
            {codeResult && (mode === "generate" || mode === "refine") && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-xs">
                        {codeResult.className}
                      </Badge>
                      {generatedEdgeAssessment && mode === "generate" && (
                        <EdgeVerdictBadge verdict={generatedEdgeAssessment} />
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopy}
                        className="gap-1 text-xs h-7"
                      >
                        {copied ? (
                          <Check className="h-3 w-3" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                        {copied ? "Copied" : "Copy"}
                      </Button>
                      <Button size="sm" onClick={handleUse} className="gap-1 text-xs h-7">
                        Use in Editor
                      </Button>
                    </div>
                  </div>

                  {codeResult.explanation && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm leading-relaxed">
                      {codeResult.explanation}
                    </div>
                  )}

                  <div className="rounded-lg bg-card border border-border overflow-hidden">
                    <div className="px-3 py-1.5 bg-muted/30 border-b border-border text-xs text-muted-foreground font-mono">
                      main.py
                    </div>
                    <pre className="p-3 text-xs font-mono overflow-x-auto max-h-64 text-green-300/90 leading-5">
                      {codeResult.code}
                    </pre>
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
