import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bot, Sparkles, Zap, Brain } from "lucide-react";

export type LLMModel =
  | "gpt-5"
  | "claude-sonnet-4-5"
  | "claude-opus-4-5"
  | "claude-haiku-4-5"
  | "gemini-pro";

interface ModelInfo {
  name: string;
  description: string;
  provider: "openai" | "anthropic" | "gemini";
  icon: typeof Bot;
  speed: "fast" | "medium" | "slow";
}

const MODEL_INFO: Record<LLMModel, ModelInfo> = {
  "gpt-5": {
    name: "GPT-5",
    description: "OpenAI's most advanced model",
    provider: "openai",
    icon: Bot,
    speed: "medium",
  },
  "claude-sonnet-4-5": {
    name: "Claude Sonnet",
    description: "Balanced performance and speed",
    provider: "anthropic",
    icon: Sparkles,
    speed: "fast",
  },
  "claude-opus-4-5": {
    name: "Claude Opus",
    description: "Best for complex reasoning",
    provider: "anthropic",
    icon: Brain,
    speed: "slow",
  },
  "claude-haiku-4-5": {
    name: "Claude Haiku",
    description: "Fastest responses",
    provider: "anthropic",
    icon: Zap,
    speed: "fast",
  },
  "gemini-pro": {
    name: "Gemini Pro",
    description: "Google's multimodal AI",
    provider: "gemini",
    icon: Sparkles,
    speed: "medium",
  },
};

const PROVIDER_COLORS: Record<string, string> = {
  openai: "bg-green-500/10 text-green-500",
  anthropic: "bg-orange-500/10 text-orange-500",
  gemini: "bg-blue-500/10 text-blue-500",
};

interface ModelSelectorProps {
  value: LLMModel;
  onChange: (model: LLMModel) => void;
  disabled?: boolean;
  showDescription?: boolean;
}

export function ModelSelector({
  value,
  onChange,
  disabled = false,
  showDescription = true,
}: ModelSelectorProps) {
  const { data: providerStatus } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/llm/status"],
    refetchInterval: 30000,
  });

  const isModelAvailable = (model: LLMModel): boolean => {
    if (!providerStatus) return true;
    const provider = MODEL_INFO[model].provider;
    return providerStatus[provider] ?? false;
  };

  const selectedModel = MODEL_INFO[value];
  const Icon = selectedModel.icon;

  return (
    <Select
      value={value}
      onValueChange={(v) => onChange(v as LLMModel)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full">
        <SelectValue>
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4" />
            <span>{selectedModel.name}</span>
            <Badge
              variant="outline"
              className={`ml-1 text-xs ${PROVIDER_COLORS[selectedModel.provider]}`}
            >
              {selectedModel.provider}
            </Badge>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.entries(MODEL_INFO) as [LLMModel, ModelInfo][]).map(
          ([modelId, info]) => {
            const available = isModelAvailable(modelId);
            const ModelIcon = info.icon;

            return (
              <SelectItem
                key={modelId}
                value={modelId}
                disabled={!available}
                className="py-3"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <ModelIcon className="h-4 w-4" />
                    <span className="font-medium">{info.name}</span>
                    <Badge
                      variant="outline"
                      className={`text-xs ${PROVIDER_COLORS[info.provider]}`}
                    >
                      {info.provider}
                    </Badge>
                    {!available && (
                      <Badge variant="secondary" className="text-xs">
                        Unavailable
                      </Badge>
                    )}
                  </div>
                  {showDescription && (
                    <span className="text-xs text-muted-foreground">
                      {info.description}
                    </span>
                  )}
                </div>
              </SelectItem>
            );
          }
        )}
      </SelectContent>
    </Select>
  );
}
