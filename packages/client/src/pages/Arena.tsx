import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SignalCard, type TradeSignal } from "@/components/llm/SignalCard";
import { apiRequest } from "@/lib/queryClient";
import { parseLLMError } from "@/lib/llmError";
import { AlertTriangle } from "lucide-react";
import {
  Swords,
  Send,
  Clock,
  Bot,
  Sparkles,
  Brain,
  Zap,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

type LLMModel =
  | "gpt-5"
  | "claude-sonnet-4-5"
  | "claude-opus-4-5"
  | "claude-haiku-4-5"
  | "gemini-pro";

interface ModelInfo {
  id: LLMModel;
  name: string;
  provider: string;
  icon: typeof Bot;
}

const MODELS: ModelInfo[] = [
  { id: "gpt-5", name: "GPT-5", provider: "OpenAI", icon: Bot },
  { id: "claude-sonnet-4-5", name: "Claude Sonnet", provider: "Anthropic", icon: Sparkles },
  { id: "claude-opus-4-5", name: "Claude Opus", provider: "Anthropic", icon: Brain },
  { id: "claude-haiku-4-5", name: "Claude Haiku", provider: "Anthropic", icon: Zap },
  { id: "gemini-pro", name: "Gemini Pro", provider: "Google", icon: Sparkles },
];

interface ArenaResult {
  content: string;
  provider: string;
  model: LLMModel;
  duration: number;
  signal?: TradeSignal;
  error?: boolean;
  errorCategory?: string;
}

export default function Arena() {
  const [prompt, setPrompt] = useState("");
  const [selectedModels, setSelectedModels] = useState<LLMModel[]>([
    "gpt-5",
    "claude-sonnet-4-5",
  ]);
  const [results, setResults] = useState<ArenaResult[]>([]);
  const [votes, setVotes] = useState<Record<LLMModel, "up" | "down" | null>>({} as any);

  const compareMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/arena/compare", {
        message: prompt,
        models: selectedModels,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setResults(data.results ?? []);
      setVotes({} as any);
    },
    onError: (err) => {
      const msg = parseLLMError(err) ?? "Failed to compare models.";
      setResults(
        selectedModels.map((model) => ({
          content: msg,
          provider: model.startsWith("gpt") ? "openai" : model.startsWith("claude") ? "anthropic" : "gemini",
          model,
          duration: 0,
          error: true,
          errorCategory: "unknown",
        }))
      );
    },
  });

  const toggleModel = (modelId: LLMModel) => {
    setSelectedModels((prev) =>
      prev.includes(modelId)
        ? prev.filter((m) => m !== modelId)
        : [...prev, modelId]
    );
  };

  const handleVote = (model: LLMModel, vote: "up" | "down") => {
    setVotes((prev) => ({
      ...prev,
      [model]: prev[model] === vote ? null : vote,
    }));
  };

  const handleCompare = () => {
    if (prompt.trim() && selectedModels.length >= 2) {
      compareMutation.mutate();
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Swords className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">LLM Arena</h1>
          <p className="text-muted-foreground">
            Compare AI models side-by-side
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Models to Compare</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {MODELS.map((model) => {
              const Icon = model.icon;
              const isSelected = selectedModels.includes(model.id);

              return (
                <label
                  key={model.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggleModel(model.id)}
                  />
                  <Icon className="h-4 w-4" />
                  <div>
                    <div className="font-medium">{model.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {model.provider}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <Textarea
              placeholder="Enter your trading question or prompt..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="min-h-[100px]"
            />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {selectedModels.length} model{selectedModels.length !== 1 ? "s" : ""}{" "}
                selected
              </span>
              <Button
                onClick={handleCompare}
                disabled={
                  !prompt.trim() ||
                  selectedModels.length < 2 ||
                  compareMutation.isPending
                }
                className="gap-2"
              >
                <Send className="h-4 w-4" />
                {compareMutation.isPending ? "Comparing..." : "Compare Models"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {compareMutation.isPending && (
        <div className="grid gap-4 md:grid-cols-2">
          {selectedModels.map((modelId) => (
            <Card key={modelId}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {results.length > 0 && !compareMutation.isPending && (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((result) => {
            const modelInfo = MODELS.find((m) => m.id === result.model);
            const Icon = modelInfo?.icon || Bot;
            const vote = votes[result.model];

            return (
              <Card key={result.model} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5" />
                      <CardTitle className="text-lg">
                        {modelInfo?.name || result.model}
                      </CardTitle>
                      <Badge variant="outline">{result.provider}</Badge>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {(result.duration / 1000).toFixed(1)}s
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  {result.error ? (
                    <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-400">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{result.content}</span>
                    </div>
                  ) : (
                    <>
                      <div className="prose prose-sm dark:prose-invert max-h-[300px] overflow-y-auto">
                        <p className="whitespace-pre-wrap">{result.content}</p>
                      </div>

                      {result.signal && (
                        <SignalCard signal={result.signal} />
                      )}

                      <div className="flex items-center gap-2 pt-2 border-t">
                        <span className="text-sm text-muted-foreground">
                          Rate this response:
                        </span>
                        <Button
                          variant={vote === "up" ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleVote(result.model, "up")}
                          className="gap-1"
                        >
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant={vote === "down" ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => handleVote(result.model, "down")}
                          className="gap-1"
                        >
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
