import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUp, ArrowDown, X, Filter } from "lucide-react";
import { Trade } from "@shared/schema";
import { TradingService } from "@/services/tradingServices";

interface TradeHistoryProps {
  trades?: Trade[];
  isLoading?: boolean;
  showFilters?: boolean;
}

export default function TradeHistory({ trades, isLoading, showFilters = false }: TradeHistoryProps) {
  const [symbolFilter, setSymbolFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "buy" | "sell">("all");
  const [strategyFilter, setStrategyFilter] = useState<string>("all");
  const [showFilterPanel, setShowFilterPanel] = useState(showFilters);

  useEffect(() => {
    setShowFilterPanel(showFilters);
  }, [showFilters]);

  const { data: strategies } = useQuery({
    queryKey: ["strategies"],
    queryFn: TradingService.getStrategies,
    enabled: showFilterPanel,
  });

  const filteredTrades = useMemo(() => {
    if (!trades) return [];
    return trades.filter((trade) => {
      const matchesSymbol = !symbolFilter || 
        trade.symbol.toLowerCase().includes(symbolFilter.toLowerCase());
      const matchesType = typeFilter === "all" || trade.type === typeFilter;
      const matchesStrategy = strategyFilter === "all" || trade.strategyId === strategyFilter;
      return matchesSymbol && matchesType && matchesStrategy;
    });
  }, [trades, symbolFilter, typeFilter, strategyFilter]);

  const clearFilters = () => {
    setSymbolFilter("");
    setTypeFilter("all");
    setStrategyFilter("all");
  };

  const hasActiveFilters = symbolFilter || typeFilter !== "all" || strategyFilter !== "all";

  if (isLoading || !trades) {
    return (
      <Card className="bg-surface border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg font-semibold text-text-primary">
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center justify-between p-3 bg-background rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-border rounded-full"></div>
                    <div>
                      <div className="h-4 bg-border rounded w-16 mb-1"></div>
                      <div className="h-3 bg-border rounded w-20"></div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 bg-border rounded w-16 mb-1"></div>
                    <div className="h-3 bg-border rounded w-12"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    } else if (diffInMinutes < 1440) {
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days} day${days > 1 ? 's' : ''} ago`;
    }
  };

  const getStrategyName = (strategyId: string) => {
    const strategy = strategies?.find((s) => s.id === strategyId);
    return strategy?.name ?? "Unknown";
  };

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-text-primary">
            Recent Trades
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilterPanel(!showFilterPanel)}
            className={`${showFilterPanel ? "text-primary" : "text-text-secondary"}`}
            data-testid="button-toggle-filters"
          >
            <Filter className="h-4 w-4 mr-1" />
            Filter
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {showFilterPanel && (
          <div className="mb-4 p-3 bg-background rounded-lg space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1 min-w-[120px]">
                <Input
                  placeholder="Search symbol..."
                  value={symbolFilter}
                  onChange={(e) => setSymbolFilter(e.target.value)}
                  className="bg-surface border-border text-text-primary h-8"
                  data-testid="input-filter-symbol"
                />
              </div>
              <Select value={typeFilter} onValueChange={(v: "all" | "buy" | "sell") => setTypeFilter(v)}>
                <SelectTrigger className="w-24 bg-surface border-border text-text-primary h-8" data-testid="select-filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="buy">Buy</SelectItem>
                  <SelectItem value="sell">Sell</SelectItem>
                </SelectContent>
              </Select>
              <Select value={strategyFilter} onValueChange={setStrategyFilter}>
                <SelectTrigger className="w-40 bg-surface border-border text-text-primary h-8" data-testid="select-filter-strategy">
                  <SelectValue placeholder="All Strategies" />
                </SelectTrigger>
                <SelectContent className="bg-surface border-border">
                  <SelectItem value="all">All Strategies</SelectItem>
                  {(strategies || []).map((strategy) => (
                    <SelectItem key={strategy.id} value={strategy.id}>
                      {strategy.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-text-secondary hover:text-text-primary h-8"
                  data-testid="button-clear-filters"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-text-secondary">
              Showing {filteredTrades.length} of {trades.length} trades
            </p>
          </div>
        )}

        <div className="space-y-4">
          {filteredTrades.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-secondary">
                {hasActiveFilters ? "No trades match your filters" : "No trades yet"}
              </p>
              {hasActiveFilters && (
                <Button
                  variant="link"
                  onClick={clearFilters}
                  className="text-primary mt-2"
                >
                  Clear filters
                </Button>
              )}
            </div>
          ) : (
            filteredTrades.map((trade, index) => {
              const Icon = trade.type === 'buy' ? ArrowUp : ArrowDown;
              const isBuy = trade.type === 'buy';
              
              return (
                <div 
                  key={trade.id} 
                  className="flex items-center justify-between p-3 bg-background rounded-lg"
                  data-testid={`trade-item-${index}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      isBuy ? 'bg-success/20' : 'bg-danger/20'
                    }`}>
                      <Icon className={`text-xs w-4 h-4 ${
                        isBuy ? 'text-success' : 'text-danger'
                      }`} />
                    </div>
                    <div>
                      <p className="font-medium text-sm text-text-primary">
                        {trade.type.toUpperCase()} {trade.symbol}
                      </p>
                      <p className="text-text-secondary text-xs">
                        {formatTimeAgo(trade.timestamp)} · {getStrategyName(trade.strategyId)}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-text-primary">
                      ${trade.price.toLocaleString()}
                    </p>
                    <p className={`text-xs ${trade.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
