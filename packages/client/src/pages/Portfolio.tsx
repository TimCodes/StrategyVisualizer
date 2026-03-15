import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import MetricsGrid from "@/components/dashboard/MetricsGrid";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import TradeHistory from "@/components/dashboard/TradeHistory";
import TradeForm from "@/components/trades/TradeForm";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus } from "lucide-react";
import { TradingService } from "@/services/tradingServices";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { InsertTrade } from "@shared/schema";

export default function Portfolio() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["portfolio-metrics"],
    queryFn: TradingService.getPortfolioMetrics,
  });

  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ["performance-data"],
    queryFn: TradingService.getPerformanceData,
  });

  const { data: trades, isLoading: tradesLoading } = useQuery({
    queryKey: ["trades"],
    queryFn: TradingService.getTrades,
  });

  const createTradeMutation = useMutation({
    mutationFn: (data: InsertTrade) => TradingService.createTrade(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trades"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio-metrics"] });
      setDialogOpen(false);
      toast({
        title: "Trade Logged",
        description: "Your trade has been recorded successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to log trade. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleTradeSubmit = async (data: InsertTrade) => {
    await createTradeMutation.mutateAsync(data);
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Portfolio Analytics"
        subtitle="Monitor your portfolio performance and trade history"
      />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-semibold text-text-primary">Portfolio Overview</h3>
          <Button
            onClick={() => setDialogOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white"
            data-testid="button-log-trade"
          >
            <Plus className="mr-2 h-4 w-4" />
            Log Trade
          </Button>
        </div>

        <MetricsGrid metrics={metrics} isLoading={metricsLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PerformanceChart
            data={performanceData || []}
            isLoading={performanceLoading}
          />

          <TradeHistory 
            trades={trades || []} 
            isLoading={tradesLoading} 
            showFilters={true}
          />
        </div>
      </main>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface border-border sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-text-primary">Log New Trade</DialogTitle>
            <DialogDescription className="text-text-secondary">
              Record a trade to track your portfolio performance.
            </DialogDescription>
          </DialogHeader>
          <TradeForm
            onSubmit={handleTradeSubmit}
            onCancel={() => setDialogOpen(false)}
            isPending={createTradeMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
