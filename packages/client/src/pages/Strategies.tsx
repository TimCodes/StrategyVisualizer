import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Play, Pause, Settings, Trash2 } from "lucide-react";
import { TradingService } from "@/services/tradingServices";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StrategyForm from "@/components/strategies/StrategyForm";
import { Strategy, InsertStrategy } from "@shared/schema";

export default function Strategies() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [deletingStrategy, setDeletingStrategy] = useState<Strategy | null>(null);

  const { data: strategies, isLoading } = useQuery({
    queryKey: ["strategies"],
    queryFn: TradingService.getStrategies,
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertStrategy) => TradingService.createStrategy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      setDialogOpen(false);
      toast({
        title: "Strategy Created",
        description: "Your new strategy has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create strategy. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<InsertStrategy> }) =>
      TradingService.updateStrategy(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      setDialogOpen(false);
      setEditingStrategy(null);
      toast({
        title: "Strategy Updated",
        description: "Your strategy has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update strategy. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => TradingService.deleteStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      setDeletingStrategy(null);
      toast({
        title: "Strategy Deleted",
        description: "The strategy has been deleted.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete strategy. Please try again.",
        variant: "destructive",
      });
    },
  });

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

  const handleFormSubmit = async (data: InsertStrategy) => {
    if (editingStrategy) {
      await updateMutation.mutateAsync({ id: editingStrategy.id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEdit = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setEditingStrategy(null);
    setDialogOpen(true);
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    setEditingStrategy(null);
  };

  const handleToggleStatus = (strategy: Strategy) => {
    const newStatus = strategy.status === "active" ? "paused" : "active";
    toggleStatusMutation.mutate({ id: strategy.id, status: newStatus });
  };

  const handleDelete = (strategy: Strategy) => {
    setDeletingStrategy(strategy);
  };

  const confirmDelete = () => {
    if (deletingStrategy) {
      deleteMutation.mutate(deletingStrategy.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-success/20 text-success";
      case "paused":
        return "bg-warning/20 text-warning";
      case "inactive":
        return "bg-danger/20 text-danger";
      default:
        return "bg-border text-text-secondary";
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
          <h3 className="text-xl font-semibold text-text-primary">
            Active Strategies
          </h3>
          <Button
            onClick={handleCreate}
            className="bg-primary hover:bg-primary/90 text-white"
            data-testid="button-create-strategy"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Strategy
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {(strategies || []).map((strategy, index) => (
            <Card
              key={strategy.id}
              className="bg-surface border-border"
              data-testid={`strategy-card-${index}`}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg text-text-primary">
                      {strategy.name}
                    </CardTitle>
                    <p className="text-text-secondary text-sm mt-1">
                      {strategy.description}
                    </p>
                  </div>
                  <Badge className={getStatusColor(strategy.status)}>
                    {strategy.status.charAt(0).toUpperCase() +
                      strategy.status.slice(1)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-text-secondary text-xs">Performance</p>
                    <p
                      className={`font-semibold ${
                        strategy.performance > 0 ? "text-success" : "text-danger"
                      }`}
                    >
                      {strategy.performance > 0 ? "+" : ""}
                      {strategy.performance.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-xs">Sharpe Ratio</p>
                    <p className="font-semibold text-text-primary">
                      {strategy.sharpeRatio.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-xs">Max Drawdown</p>
                    <p className="font-semibold text-danger">
                      {strategy.maxDrawdown.toFixed(2)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-text-secondary text-xs">Win Rate</p>
                    <p className="font-semibold text-text-primary">
                      {strategy.winRate.toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="border-t border-border pt-4">
                  <p className="text-text-secondary text-xs mb-2">
                    Total Trades: {strategy.totalTrades}
                  </p>
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 bg-background border-border hover:bg-border"
                      onClick={() => handleToggleStatus(strategy)}
                      disabled={toggleStatusMutation.isPending}
                      data-testid={`button-toggle-${index}`}
                    >
                      {strategy.status === "active" ? (
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
                      onClick={() => handleEdit(strategy)}
                      data-testid={`button-settings-${index}`}
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="bg-background border-border hover:bg-danger/20 hover:border-danger hover:text-danger"
                      onClick={() => handleDelete(strategy)}
                      data-testid={`button-delete-${index}`}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {(!strategies || strategies.length === 0) && (
          <div className="text-center py-12">
            <p className="text-text-secondary mb-4">No strategies yet</p>
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Strategy
            </Button>
          </div>
        )}
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-text-primary">
              {editingStrategy ? "Edit Strategy" : "Create New Strategy"}
            </DialogTitle>
            <DialogDescription className="text-text-secondary">
              {editingStrategy
                ? "Update your strategy settings below."
                : "Configure your new trading strategy."}
            </DialogDescription>
          </DialogHeader>
          <StrategyForm
            strategy={editingStrategy ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleDialogClose}
            isPending={createMutation.isPending || updateMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!deletingStrategy}
        onOpenChange={(open) => !open && setDeletingStrategy(null)}
      >
        <AlertDialogContent className="bg-surface border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-text-primary">
              Delete Strategy
            </AlertDialogTitle>
            <AlertDialogDescription className="text-text-secondary">
              Are you sure you want to delete "{deletingStrategy?.name}"? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-background border-border hover:bg-border">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-danger hover:bg-danger/90 text-white"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
