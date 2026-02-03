import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TradingService } from "@/services/tradingServices";
import type { OrderBook as OrderBookType, OrderBookEntry } from "@shared/schema";
import { AlertCircle } from "lucide-react";

interface OrderBookProps {
  symbol: string;
}

export default function OrderBook({ symbol }: OrderBookProps) {
  const { data: orderBook, isLoading, error } = useQuery<OrderBookType>({
    queryKey: ["orderbook", symbol],
    queryFn: () => TradingService.getOrderBook(symbol),
    refetchInterval: 5000,
  });

  if (isLoading) {
    return (
      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle className="text-text-primary">Order Book - {symbol}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle className="text-text-primary">Order Book - {symbol}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-text-secondary">
            <AlertCircle className="w-4 h-4" />
            <span>Unable to load order book data</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!orderBook || orderBook.bids.length === 0 || orderBook.asks.length === 0) {
    return (
      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle className="text-text-primary">Order Book - {symbol}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-text-secondary text-center py-8">
            No order book data available for {symbol}
          </div>
        </CardContent>
      </Card>
    );
  }

  const maxBidTotal = Math.max(...orderBook.bids.map((b) => b.total), 0);
  const maxAskTotal = Math.max(...orderBook.asks.map((a) => a.total), 0);
  const maxTotal = Math.max(maxBidTotal, maxAskTotal, 1);

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-text-primary">Order Book - {symbol}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Spread: ${orderBook.spread.toFixed(2)} ({orderBook.spreadPercent.toFixed(4)}%)
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between text-xs text-text-secondary mb-2 px-2">
              <span>Price (USD)</span>
              <span>Size</span>
              <span>Total</span>
            </div>
            <div className="space-y-1">
              {orderBook.bids.slice(0, 10).map((bid, index) => (
                <OrderBookRow
                  key={index}
                  entry={bid}
                  type="bid"
                  maxTotal={maxTotal}
                />
              ))}
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs text-text-secondary mb-2 px-2">
              <span>Price (USD)</span>
              <span>Size</span>
              <span>Total</span>
            </div>
            <div className="space-y-1">
              {orderBook.asks.slice(0, 10).map((ask, index) => (
                <OrderBookRow
                  key={index}
                  entry={ask}
                  type="ask"
                  maxTotal={maxTotal}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-sm font-medium text-text-primary mb-3">Depth Chart</h4>
          <DepthChart bids={orderBook.bids} asks={orderBook.asks} />
        </div>
      </CardContent>
    </Card>
  );
}

interface OrderBookRowProps {
  entry: OrderBookEntry;
  type: "bid" | "ask";
  maxTotal: number;
}

function OrderBookRow({ entry, type, maxTotal }: OrderBookRowProps) {
  const percentage = maxTotal > 0 ? (entry.total / maxTotal) * 100 : 0;
  const bgColor = type === "bid" ? "bg-success/20" : "bg-danger/20";
  const textColor = type === "bid" ? "text-success" : "text-danger";

  return (
    <div className="relative">
      <div
        className={`absolute inset-0 ${bgColor} rounded`}
        style={{
          width: `${percentage}%`,
          [type === "bid" ? "right" : "left"]: 0,
        }}
      />
      <div className="relative flex justify-between items-center px-2 py-1 text-sm">
        <span className={`font-mono ${textColor}`}>
          {entry.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
        <span className="font-mono text-text-primary">
          {entry.quantity.toFixed(4)}
        </span>
        <span className="font-mono text-text-secondary">
          {entry.total.toFixed(4)}
        </span>
      </div>
    </div>
  );
}

interface DepthChartProps {
  bids: OrderBookEntry[];
  asks: OrderBookEntry[];
}

function DepthChart({ bids, asks }: DepthChartProps) {
  const chartHeight = 120;
  const chartWidth = 100;

  if (bids.length === 0 && asks.length === 0) {
    return (
      <div className="bg-background rounded-lg p-3 text-center text-text-secondary">
        No depth data available
      </div>
    );
  }

  const maxBidTotal = bids.length > 0 ? bids[bids.length - 1].total : 0;
  const maxAskTotal = asks.length > 0 ? asks[asks.length - 1].total : 0;
  const maxTotal = Math.max(maxBidTotal, maxAskTotal, 1);

  const bidPoints = bids.map((bid, i) => {
    const x = bids.length > 1 ? ((bids.length - 1 - i) / (bids.length - 1)) * 50 : 25;
    const y = chartHeight - (bid.total / maxTotal) * chartHeight;
    return `${x},${y}`;
  });

  const askPoints = asks.map((ask, i) => {
    const x = asks.length > 1 ? 50 + (i / (asks.length - 1)) * 50 : 75;
    const y = chartHeight - (ask.total / maxTotal) * chartHeight;
    return `${x},${y}`;
  });

  const bidPath = bidPoints.length > 0 
    ? `M0,${chartHeight} L${bidPoints.join(" L")} L50,${chartHeight} Z`
    : "";
  
  const askPath = askPoints.length > 0
    ? `M50,${chartHeight} L${askPoints.join(" L")} L${chartWidth},${chartHeight} Z`
    : "";

  return (
    <div className="bg-background rounded-lg p-3">
      <svg
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        className="w-full h-32"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="bidGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="askGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="rgb(239, 68, 68)" stopOpacity="0.6" />
            <stop offset="100%" stopColor="rgb(239, 68, 68)" stopOpacity="0.1" />
          </linearGradient>
        </defs>
        
        <line
          x1="50"
          y1="0"
          x2="50"
          y2={chartHeight}
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeDasharray="2,2"
        />

        {bidPath && (
          <path
            d={bidPath}
            fill="url(#bidGradient)"
            stroke="rgb(34, 197, 94)"
            strokeWidth="1"
          />
        )}

        {askPath && (
          <path
            d={askPath}
            fill="url(#askGradient)"
            stroke="rgb(239, 68, 68)"
            strokeWidth="1"
          />
        )}
      </svg>
      
      <div className="flex justify-between mt-2 text-xs text-text-secondary">
        <span className="text-success">Bids (Buy Orders)</span>
        <span className="text-danger">Asks (Sell Orders)</span>
      </div>
    </div>
  );
}
