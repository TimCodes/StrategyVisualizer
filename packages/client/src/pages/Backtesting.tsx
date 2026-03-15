import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import BacktestingTable from "@/components/dashboard/BacktestingTable";
import BacktestForm from "@/components/backtesting/BacktestForm";
import BacktestDetail from "@/components/backtesting/BacktestDetail";
import BacktestComparison from "@/components/backtesting/BacktestComparison";
import { TradingService } from "@/services/tradingServices";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { BacktestResult } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Backtesting() {
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);
  const [selectedBacktest, setSelectedBacktest] = useState<BacktestResult | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  
  const { data: backtestResults, isLoading } = useQuery({
    queryKey: ["backtest-results"],
    queryFn: TradingService.getBacktestResults,
  });

  const runBacktestMutation = useMutation({
    mutationFn: TradingService.runBacktest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backtest-results"] });
      toast({
        title: "Backtest Complete",
        description: "Your backtest has finished running. Results are now available.",
      });
      setShowForm(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to run backtest. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRunBacktest = () => {
    setShowForm(true);
  };

  const handleSubmit = async (data: {
    strategyId: string;
    startDate: string;
    endDate: string;
    initialCapital: number;
    symbol: string;
  }) => {
    await runBacktestMutation.mutateAsync(data);
  };

  const handleSelectBacktest = (backtest: BacktestResult) => {
    setSelectedBacktest(backtest);
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleCompare = () => {
    setShowComparison(true);
  };

  const selectedBacktests = backtestResults?.filter((b) => selectedIds.includes(b.id)) || [];

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Strategy Backtesting"
        subtitle="Test your trading strategies against historical market data"
      />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <BacktestingTable
          results={backtestResults || []}
          isLoading={isLoading}
          onRunBacktest={handleRunBacktest}
          onSelectBacktest={handleSelectBacktest}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onCompare={handleCompare}
        />
      </main>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="bg-surface border-border">
          <DialogHeader>
            <DialogTitle className="text-text-primary">Run New Backtest</DialogTitle>
          </DialogHeader>
          <BacktestForm
            onSubmit={handleSubmit}
            onCancel={() => setShowForm(false)}
            isPending={runBacktestMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedBacktest} onOpenChange={() => setSelectedBacktest(null)}>
        <DialogContent className="bg-surface border-border max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-text-primary">Backtest Details</DialogTitle>
          </DialogHeader>
          {selectedBacktest && <BacktestDetail backtest={selectedBacktest} />}
        </DialogContent>
      </Dialog>

      <Dialog open={showComparison} onOpenChange={setShowComparison}>
        <DialogContent className="bg-surface border-border max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-text-primary">
              Compare Backtests ({selectedBacktests.length} selected)
            </DialogTitle>
          </DialogHeader>
          {selectedBacktests.length >= 2 && (
            <BacktestComparison backtests={selectedBacktests} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
