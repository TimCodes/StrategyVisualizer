import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import BacktestingTable from "@/components/dashboard/BacktestingTable";
import { TradingService } from "@/services/tradingServices";
import { useToast } from "@/hooks/use-toast";

export default function Backtesting() {
  const { toast } = useToast();
  
  const { data: backtestResults, isLoading } = useQuery({
    queryKey: ["backtest-results"],
    queryFn: TradingService.getBacktestResults,
  });

  const handleRunBacktest = async () => {
    try {
      await TradingService.runBacktest("1", {});
      toast({
        title: "Backtest Started",
        description: "Your backtest has been queued and will run shortly.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to start backtest. Please try again.",
        variant: "destructive",
      });
    }
  };

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
        />
      </main>
    </div>
  );
}
