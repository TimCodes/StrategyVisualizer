import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Pause, Settings } from "lucide-react";
import { TradingService } from "@/services/tradingServices";

export default function Strategies() {
  const { data: strategies, isLoading } = useQuery({
    queryKey: ["strategies"],
    queryFn: TradingService.getStrategies,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-success/20 text-success';
      case 'paused':
        return 'bg-warning/20 text-warning';
      case 'inactive':
        return 'bg-danger/20 text-danger';
      default:
        return 'bg-border text-text-secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <Header
          title="Trading Strategies"
          subtitle="Manage and monitor your algorithmic trading strategies"
        />
        <main className="flex-1 p-6">
          <div className="animate-pulse space-y-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-48 bg-surface rounded-xl"></div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Trading Strategies"
        subtitle="Manage and monitor your algorithmic trading strategies"
      />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-text-primary">Active Strategies</h3>
          <Button className="bg-primary hover:bg-primary/90 text-white" data-testid="button-create-strategy">
            <Plus className="mr-2 h-4 w-4" />
            Create Strategy
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies?.map((strategy, index) => (
            <Card key={strategy.id} className="bg-surface border-border" data-testid={`strategy-card-${index}`}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-text-primary">{strategy.name}</CardTitle>
                    <p className="text-text-secondary text-sm mt-1">{strategy.description}</p>
                  </div>
                  <Badge className={getStatusColor(strategy.status)}>
                    {strategy.status.charAt(0).toUpperCase() + strategy.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-text-secondary text-xs">Performance</p>
                    <p className={`font-semibold ${
                      strategy.performance > 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {strategy.performance > 0 ? '+' : ''}{strategy.performance.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-xs">Sharpe Ratio</p>
                    <p className="font-semibold text-text-primary">{strategy.sharpeRatio.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-xs">Max Drawdown</p>
                    <p className="font-semibold text-danger">{strategy.maxDrawdown.toFixed(2)}%</p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-xs">Win Rate</p>
                    <p className="font-semibold text-text-primary">{strategy.winRate.toFixed(1)}%</p>
                  </div>
                </div>
                
                <div className="border-t border-border pt-4">
                  <p className="text-text-secondary text-xs mb-2">Total Trades: {strategy.totalTrades}</p>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="flex-1 bg-background border-border hover:bg-border"
                      data-testid={`button-toggle-${index}`}
                    >
                      {strategy.status === 'active' ? (
                        <>
                          <Pause className="mr-1 h-3 w-3" />
                          Pause
                        </>
                      ) : (
                        <>
                          <Play className="mr-1 h-3 w-3" />
                          Start
                        </>
                      )}
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="bg-background border-border hover:bg-border"
                      data-testid={`button-settings-${index}`}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
