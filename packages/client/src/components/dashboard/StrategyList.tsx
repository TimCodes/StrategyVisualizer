import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Plus, ArrowRight } from "lucide-react";
import { Strategy } from "@shared/schema";
import { TradingService } from "@/services/tradingServices";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface StrategyListProps {
  strategies?: Strategy[];
  isLoading?: boolean;
}

export default function StrategyList({ strategies, isLoading }: StrategyListProps) {
  const { toast } = useToast();

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      TradingService.updateStrategy(id, { status: status as "active" | "inactive" | "paused" }),
    onMutate: async ({ id, status }) => {
      await queryClient.cancelQueries({ queryKey: ["strategies"] });
      const previousStrategies = queryClient.getQueryData<Strategy[]>(["strategies"]);
      queryClient.setQueryData<Strategy[]>(["strategies"], (old) =>
        old?.map((s) => (s.id === id ? { ...s, status: status as "active" | "inactive" | "paused" } : s))
      );
      return { previousStrategies };
    },
    onError: (err, variables, context) => {
      if (context?.previousStrategies) {
        queryClient.setQueryData(["strategies"], context.previousStrategies);
      }
      toast({
        title: "Error",
        description: "Failed to update strategy status.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
    },
  });

  const handleToggle = (strategy: Strategy) => {
    const newStatus = strategy.status === "active" ? "inactive" : "active";
    toggleStatusMutation.mutate({ id: strategy.id, status: newStatus });
  };

  if (isLoading || !strategies) {
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
      <CardHeader className="border-b border-border flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold text-text-primary">
          Active Strategies
        </CardTitle>
        <Link href="/strategies">
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid="link-view-all-strategies">
            View All <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {strategies.map((strategy, index) => (
          <div 
            key={strategy.id} 
            className="flex items-center justify-between p-4 bg-background rounded-lg"
            data-testid={`strategy-item-${index}`}
          >
            <div className="flex-1">
              <p className="font-medium text-text-primary">{strategy.name}</p>
              <p className="text-text-secondary text-sm">{strategy.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className={`text-sm font-medium ${
                  strategy.performance > 0 ? 'text-success' : 'text-danger'
                }`}>
                  {strategy.performance > 0 ? '+' : ''}{strategy.performance.toFixed(1)}%
                </p>
              </div>
              <Switch
                checked={strategy.status === "active"}
                onCheckedChange={() => handleToggle(strategy)}
                disabled={toggleStatusMutation.isPending}
                data-testid={`switch-strategy-${index}`}
              />
            </div>
          </div>
        ))}

        {strategies.length === 0 && (
          <div className="text-center py-4">
            <p className="text-text-secondary text-sm">No strategies yet</p>
          </div>
        )}

        <Link href="/strategies">
          <Button 
            className="w-full mt-4 bg-primary hover:bg-primary/90 text-white"
            data-testid="button-add-strategy"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Strategy
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
