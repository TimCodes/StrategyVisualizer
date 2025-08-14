import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Strategy } from "@shared/schema";

interface StrategyListProps {
  strategies: Strategy[];
  isLoading?: boolean;
}

export default function StrategyList({ strategies, isLoading }: StrategyListProps) {
  if (isLoading) {
    return (
      <Card className="bg-surface border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg font-semibold text-text-primary">
            Active Strategies
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center justify-between p-4 bg-background rounded-lg">
                <div className="flex-1">
                  <div className="h-4 bg-border rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-border rounded w-1/2"></div>
                </div>
                <div className="text-right">
                  <div className="h-4 bg-border rounded w-12 mb-1"></div>
                  <div className="w-2 h-2 bg-border rounded-full ml-auto"></div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="border-b border-border">
        <CardTitle className="text-lg font-semibold text-text-primary">
          Active Strategies
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {strategies.map((strategy, index) => (
          <div 
            key={strategy.id} 
            className="flex items-center justify-between p-4 bg-background rounded-lg"
            data-testid={`strategy-item-${index}`}
          >
            <div>
              <p className="font-medium text-text-primary">{strategy.name}</p>
              <p className="text-text-secondary text-sm">{strategy.description}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${
                strategy.performance > 0 ? 'text-success' : 'text-danger'
              }`}>
                {strategy.performance > 0 ? '+' : ''}{strategy.performance.toFixed(1)}%
              </p>
              <div className={`w-2 h-2 rounded-full ${
                strategy.status === 'active' ? 'bg-success' : 
                strategy.status === 'paused' ? 'bg-warning' : 'bg-danger'
              }`}></div>
            </div>
          </div>
        ))}

        <Button 
          className="w-full mt-4 bg-primary hover:bg-primary/90 text-white"
          data-testid="button-add-strategy"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Strategy
        </Button>
      </CardContent>
    </Card>
  );
}
