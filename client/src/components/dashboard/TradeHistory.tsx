import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";
import { Trade } from "@shared/schema";

interface TradeHistoryProps {
  trades?: Trade[];
  isLoading?: boolean;
}

export default function TradeHistory({ trades, isLoading }: TradeHistoryProps) {
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

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const diffInMinutes = Math.floor((now.getTime() - dateObj.getTime()) / (1000 * 60));
    
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

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg font-semibold text-text-primary">
          Recent Trades
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <div className="space-y-4">
          {trades.map((trade, index) => {
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
                      {formatTimeAgo(trade.timestamp)}
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
          })}
        </div>
      </CardContent>
    </Card>
  );
}
