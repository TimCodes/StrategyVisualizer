import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Play, Pause, Settings, Trash2, ChevronDown, CheckCircle2, XCircle, Archive } from "lucide-react";
import { TradingService } from "@/services/tradingServices";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import StrategyForm from "@/components/strategies/StrategyForm";
import GatePipelinePanel from "@/components/strategies/GatePipelinePanel";
import { Strategy, InsertStrategy, PipelineStage, GateStatus } from "@shared/schema";

const STAGE_LABELS: Record<PipelineStage, string> = {
  idea: "Idea",
  feasibility: "Feasibility",
  walk_forward: "Walk Forward",
  monte_carlo: "Monte Carlo",
  incubation: "Incubation",
  diversification_sizing: "Div. & Sizing",
  live: "Live",
};

function getStageBadgeClass(stage: PipelineStage): string {
  if (stage === "live") return "bg-primary/20 text-primary border border-primary/30";
  if (stage === "incubation" || stage === "diversification_sizing")
    return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
  return "bg-border text-text-secondary border border-border";
}

function getGateStatusConfig(status: GateStatus) {
  switch (status) {
    case "passed":
      return { label: "Passed", className: "bg-success/20 text-success border border-success/30" };
    case "failed":
      return { label: "Failed", className: "bg-danger/20 text-danger border border-danger/30" };
    case "discarded":
      return { label: "Discarded", className: "bg-border text-text-secondary border border-border opacity-60" };
    case "in_progress":
    default:
      return { label: "In Progress", className: "bg-warning/10 text-warning border border-warning/30" };
  }
}

export default function Strategies() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<Strategy | null>(null);
  const [deletingStrategy, setDeletingStrategy] = useState<Strategy | null>(null);

  const { data: strategies, isLoading } = useQuery({
    queryKey: ["strategies"],
    queryFn: TradingService.getStrategies,
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

  const gateMutation = useMutation({
    mutationFn: ({ id, result, note }: { id: string; result: "passed" | "failed" | "discarded"; note?: string }) =>
      TradingService.recordGate(id, { result, note }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      const label = STAGE_LABELS[updated.stage];
      toast({
        title: "Gate recorded",
        description: `Strategy is now at stage: ${label}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record gate transition.",
        variant: "destructive",
      });
    },
  });

  const handleFormSubmit = async (data: InsertStrategy) => {
    if (editingStrategy) {
      await updateMutation.mutateAsync({ id: editingStrategy.id, data });
    }
  };

  const handleEdit = (strategy: Strategy) => {
    setEditingStrategy(strategy);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    navigate("/editor");
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
          {(strategies || []).map((strategy, index) => {
            const gateConfig = getGateStatusConfig(strategy.gateStatus);
            const isGatePending = gateMutation.isPending;
            return (
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

                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <Badge className={`text-xs font-medium ${getStageBadgeClass(strategy.stage)}`}>
                      {STAGE_LABELS[strategy.stage]}
                    </Badge>
                    <Badge className={`text-xs ${gateConfig.className}`}>
                      {gateConfig.label}
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

                  <div className="border-t border-border pt-4 space-y-3">
                    <p className="text-text-secondary text-xs">
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

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full bg-background border-border hover:bg-border text-text-secondary"
                          disabled={isGatePending}
                          data-testid={`button-gate-menu-${index}`}
                        >
                          Gate Review
                          <ChevronDown className="ml-1 h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-surface border-border w-44">
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-success/10 focus:bg-success/10 text-success"
                          onClick={() => gateMutation.mutate({ id: strategy.id, result: "passed" })}
                        >
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Pass Gate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="bg-border" />
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-warning/10 focus:bg-warning/10 text-warning"
                          onClick={() => gateMutation.mutate({ id: strategy.id, result: "failed" })}
                        >
                          <XCircle className="mr-2 h-4 w-4" />
                          Fail Gate
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer hover:bg-border focus:bg-border text-text-secondary"
                          onClick={() => gateMutation.mutate({ id: strategy.id, result: "discarded" })}
                        >
                          <Archive className="mr-2 h-4 w-4" />
                          Discard
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="border-t border-border pt-3">
                      <GatePipelinePanel strategyId={strategy.id} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
            <DialogTitle className="text-text-primary">Edit Strategy</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Update your strategy settings below.
            </DialogDescription>
          </DialogHeader>
          <StrategyForm
            strategy={editingStrategy ?? undefined}
            onSubmit={handleFormSubmit}
            onCancel={handleDialogClose}
            isPending={updateMutation.isPending}
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
