import { useState } from "react";
import { Sparkles, Loader2, Copy, Check, ChevronDown, RefreshCw } from "lucide-react";
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

interface StrategyAgentProps {
  open: boolean;
  onClose: () => void;
  onUseCode: (code: string) => void;
  currentCode?: string;
}

interface GenerationResult {
  code: string;
  explanation: string;
  className: string;
}

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

const REBALANCE_FREQUENCIES = [
  "Daily",
  "Weekly",
  "Monthly",
  "Quarterly",
  "On Signal",
];

export function StrategyAgent({
  open,
  onClose,
  onUseCode,
  currentCode,
}: StrategyAgentProps) {
  const [description, setDescription] = useState("");
  const [assetClass, setAssetClass] = useState("Equities (US Stocks/ETFs)");
  const [timeframe, setTimeframe] = useState("Daily");
  const [riskLevel, setRiskLevel] = useState("Moderate");
  const [initialCapital, setInitialCapital] = useState("100000");
  const [rebalanceFreq, setRebalanceFreq] = useState("On Signal");
  const [mode, setMode] = useState<"generate" | "refine" | "explain" | "optimize">("generate");
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refineFeedback, setRefineFeedback] = useState("");
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!description.trim()) {
      toast({ title: "Please describe your strategy", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult(null);
    setExplanation(null);
    setSuggestions(null);

    try {
      const res = await apiRequest("POST", "/api/lean/agent/generate", {
        description,
        model: "gpt-5",
        constraints: {
          initialCapital: parseInt(initialCapital) || 100000,
          assetClass,
          timeframe,
          riskLevel,
          rebalanceFrequency: rebalanceFreq,
        },
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      toast({
        title: "Generation failed",
        description: "Check your OpenAI API key in Settings.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!currentCode) {
      toast({ title: "No code to refine", variant: "destructive" });
      return;
    }
    if (!refineFeedback.trim()) {
      toast({ title: "Please provide refinement feedback", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setResult(null);

    try {
      const res = await apiRequest("POST", "/api/lean/agent/refine", {
        previousCode: currentCode,
        userFeedback: refineFeedback,
        model: "gpt-5",
      });
      const data = await res.json();
      setResult(data);
    } catch {
      toast({ title: "Refinement failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplain = async () => {
    const code = currentCode || result?.code;
    if (!code) {
      toast({ title: "No code to explain", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setExplanation(null);

    try {
      const res = await apiRequest("POST", "/api/lean/agent/explain", {
        code,
        model: "gpt-5",
      });
      const data = await res.json();
      setExplanation(data.explanation);
    } catch {
      toast({ title: "Explanation failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimize = async () => {
    const code = currentCode || result?.code;
    if (!code) {
      toast({ title: "No code to optimize", variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setSuggestions(null);

    try {
      const res = await apiRequest("POST", "/api/lean/agent/optimize", {
        code,
        model: "gpt-5",
      });
      const data = await res.json();
      if (Array.isArray(data.suggestions)) {
        setSuggestions(
          data.suggestions
            .map(
              (s: { title: string; solution: string }) =>
                `• ${s.title}: ${s.solution}`
            )
            .join("\n\n")
        );
      } else {
        setSuggestions(JSON.stringify(data.suggestions, null, 2));
      }
    } catch {
      toast({ title: "Optimization failed", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    const code = result?.code;
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleUse = () => {
    if (result?.code) {
      onUseCode(result.code);
      onClose();
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl flex flex-col p-0"
      >
        <SheetHeader className="p-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Strategy Agent
          </SheetTitle>
        </SheetHeader>

        <div className="flex gap-1 p-4 pb-0">
          {(["generate", "refine", "explain", "optimize"] as const).map(
            (m) => (
              <Button
                key={m}
                variant={mode === m ? "default" : "ghost"}
                size="sm"
                onClick={() => setMode(m)}
                className="capitalize text-xs"
              >
                {m}
              </Button>
            )
          )}
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {mode === "generate" && (
              <>
                <div className="space-y-1.5">
                  <Label>Strategy Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. A momentum strategy that rotates monthly into the top 3 performing S&P 500 sector ETFs based on 6-month returns, with a 10% max drawdown stop..."
                    rows={4}
                    className="resize-none text-sm"
                  />
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
                          <SelectItem key={a} value={a} className="text-xs">
                            {a}
                          </SelectItem>
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
                          <SelectItem key={t} value={t} className="text-xs">
                            {t}
                          </SelectItem>
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
                          <SelectItem key={r} value={r} className="text-xs">
                            {r}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Rebalance</Label>
                    <Select
                      value={rebalanceFreq}
                      onValueChange={setRebalanceFreq}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {REBALANCE_FREQUENCIES.map((r) => (
                          <SelectItem key={r} value={r} className="text-xs">
                            {r}
                          </SelectItem>
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
                  onClick={handleGenerate}
                  disabled={isLoading || !description.trim()}
                  className="w-full gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {isLoading ? "Generating..." : "Generate Strategy"}
                </Button>
              </>
            )}

            {mode === "refine" && (
              <>
                <div className="space-y-1.5">
                  <Label>What to improve or change?</Label>
                  <Textarea
                    value={refineFeedback}
                    onChange={(e) => setRefineFeedback(e.target.value)}
                    placeholder="e.g. Add a stop-loss at 5% below entry, reduce trading frequency, add RSI filter to confirm signals..."
                    rows={4}
                    className="resize-none text-sm"
                  />
                </div>
                {!currentCode && (
                  <p className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                    No strategy loaded in editor. Open a project to refine its code.
                  </p>
                )}
                <Button
                  onClick={handleRefine}
                  disabled={isLoading || !refineFeedback.trim() || !currentCode}
                  className="w-full gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                  {isLoading ? "Refining..." : "Refine Strategy"}
                </Button>
              </>
            )}

            {mode === "explain" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Get a plain-English explanation of the current strategy in the editor.
                </p>
                {!currentCode && !result?.code && (
                  <p className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                    No strategy loaded. Open a project or generate one first.
                  </p>
                )}
                <Button
                  onClick={handleExplain}
                  disabled={isLoading || (!currentCode && !result?.code)}
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

            {mode === "optimize" && (
              <>
                <p className="text-sm text-muted-foreground">
                  Get AI-powered optimization suggestions for the current strategy.
                </p>
                {!currentCode && !result?.code && (
                  <p className="text-xs text-muted-foreground bg-yellow-500/10 border border-yellow-500/20 rounded p-2">
                    No strategy loaded. Open a project or generate one first.
                  </p>
                )}
                <Button
                  onClick={handleOptimize}
                  disabled={isLoading || (!currentCode && !result?.code)}
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

            {result && (mode === "generate" || mode === "refine") && (
              <>
                <Separator />

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {result.className}
                      </Badge>
                      <span className="text-xs text-green-400">Generated</span>
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
                      <Button
                        size="sm"
                        onClick={handleUse}
                        className="gap-1 text-xs h-7"
                      >
                        Use in Editor
                      </Button>
                    </div>
                  </div>

                  {result.explanation && (
                    <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 text-sm leading-relaxed">
                      {result.explanation}
                    </div>
                  )}

                  <div className="rounded-lg bg-card border border-border overflow-hidden">
                    <div className="px-3 py-1.5 bg-muted/30 border-b border-border text-xs text-muted-foreground font-mono">
                      main.py
                    </div>
                    <pre className="p-3 text-xs font-mono overflow-x-auto max-h-64 text-green-300/90 leading-5">
                      {result.code}
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
