import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  X,
  ArrowRight,
} from "lucide-react";

export interface TradeSignal {
  id: string;
  action: "buy" | "sell" | "hold";
  symbol: string;
  confidence: number;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  reasoning?: string;
  provider: string;
  model: string;
  timestamp: Date;
}

interface SignalCardProps {
  signal: TradeSignal;
  onExecute?: (signal: TradeSignal) => void;
  onDismiss?: (signalId: string) => void;
}

const ACTION_CONFIG = {
  buy: {
    icon: TrendingUp,
    label: "BUY SIGNAL",
    bgColor: "bg-green-500/10",
    borderColor: "border-green-500/30",
    textColor: "text-green-500",
    badgeVariant: "default" as const,
  },
  sell: {
    icon: TrendingDown,
    label: "SELL SIGNAL",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    textColor: "text-red-500",
    badgeVariant: "destructive" as const,
  },
  hold: {
    icon: Minus,
    label: "HOLD SIGNAL",
    bgColor: "bg-gray-500/10",
    borderColor: "border-gray-500/30",
    textColor: "text-gray-500",
    badgeVariant: "secondary" as const,
  },
};

export function SignalCard({ signal, onExecute, onDismiss }: SignalCardProps) {
  const config = ACTION_CONFIG[signal.action];
  const Icon = config.icon;

  const formatPrice = (price?: number) => {
    if (!price) return "—";
    return `$${price.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const calculatePercentage = (target?: number, entry?: number) => {
    if (!target || !entry) return null;
    const diff = ((target - entry) / entry) * 100;
    return diff.toFixed(1);
  };

  const stopLossPercent = calculatePercentage(signal.stopLoss, signal.entryPrice);
  const takeProfitPercent = calculatePercentage(signal.takeProfit, signal.entryPrice);

  const timeAgo = () => {
    const now = new Date();
    const diff = now.getTime() - new Date(signal.timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${Math.floor(hours / 24)} day${hours > 24 ? "s" : ""} ago`;
  };

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.textColor}`} />
            <span className={`font-bold ${config.textColor}`}>
              {config.label}
            </span>
            <span className="font-bold">{signal.symbol}</span>
          </div>
          {onDismiss && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => onDismiss(signal.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium">{signal.confidence}%</span>
          </div>
          <Progress value={signal.confidence} className="h-2" />
        </div>

        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="space-y-1">
            <span className="text-muted-foreground">Entry</span>
            <div className="font-medium">{formatPrice(signal.entryPrice)}</div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Stop Loss</span>
            <div className="font-medium text-red-500">
              {formatPrice(signal.stopLoss)}
              {stopLossPercent && (
                <span className="text-xs ml-1">({stopLossPercent}%)</span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <span className="text-muted-foreground">Take Profit</span>
            <div className="font-medium text-green-500">
              {formatPrice(signal.takeProfit)}
              {takeProfitPercent && (
                <span className="text-xs ml-1">(+{takeProfitPercent}%)</span>
              )}
            </div>
          </div>
        </div>

        {signal.reasoning && (
          <p className="text-sm text-muted-foreground italic">
            "{signal.reasoning}"
          </p>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline" className="text-xs">
            {signal.model}
          </Badge>
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {timeAgo()}
          </span>
        </div>

        {onExecute && signal.action !== "hold" && (
          <Button
            size="sm"
            variant={signal.action === "buy" ? "default" : "destructive"}
            onClick={() => onExecute(signal)}
            className="gap-1"
          >
            Execute Trade
            <ArrowRight className="h-3 w-3" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

interface SignalListProps {
  signals: TradeSignal[];
  onExecute?: (signal: TradeSignal) => void;
  onDismiss?: (signalId: string) => void;
}

export function SignalList({ signals, onExecute, onDismiss }: SignalListProps) {
  if (signals.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {signals.map((signal) => (
        <SignalCard
          key={signal.id}
          signal={signal}
          onExecute={onExecute}
          onDismiss={onDismiss}
        />
      ))}
    </div>
  );
}
