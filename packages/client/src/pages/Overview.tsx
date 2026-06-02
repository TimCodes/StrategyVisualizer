import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import MetricsGrid from "@/components/dashboard/MetricsGrid";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import StrategyList from "@/components/dashboard/StrategyList";
import MarketChart from "@/components/dashboard/MarketChart";
import TradeHistory from "@/components/dashboard/TradeHistory";
import BacktestingTable from "@/components/dashboard/BacktestingTable";
import { TradingService } from "@/services/tradingServices";
import { useToast } from "@/hooks/use-toast";

export default function Overview() {
  const { toast } = useToast();
  
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ["portfolio-metrics"],
    queryFn: TradingService.getPortfolioMetrics,
  });

  const { data: performanceData, isLoading: performanceLoading } = useQuery({
    queryKey: ["performance-data"],
    queryFn: TradingService.getPerformanceData,
  });

  const { data: strategies, isLoading: strategiesLoading } = useQuery({
    queryKey: ["strategies"],
    queryFn: TradingService.getStrategies,
  });

  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ["price-data", "BTC/USD"],
    queryFn: () => TradingService.getPriceData("BTC/USD"),
  });

  const { data: trades, isLoading: tradesLoading } = useQuery({
    queryKey: ["trades"],
    queryFn: TradingService.getTrades,
  });

  const { data: backtestResults, isLoading: backtestLoading } = useQuery({
    queryKey: ["backtest-results"],
    queryFn: TradingService.getBacktestResults,
  });

  const handleRefresh = () => {
    window.location.reload();
    toast({
      title: "Data Refreshed",
      description: "All dashboard data has been refreshed successfully.",
    });
  };

  const handleRunBacktest = async () => {
    try {
      const now = new Date();
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      await TradingService.runBacktest({
        strategyId: "1",
        startDate: oneYearAgo.toISOString(),
        endDate: now.toISOString(),
        initialCapital: 100000,
        symbol: "BTC/USD",
      });
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
        title="Trading Analytics Dashboard"
        subtitle="Strategy backtesting and market data visualization"
        onRefresh={handleRefresh}
      />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <MetricsGrid metrics={metrics} isLoading={metricsLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PerformanceChart
            data={performanceData || []}
            isLoading={performanceLoading}
          />

          <StrategyList strategies={strategies || []} isLoading={strategiesLoading} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MarketChart
            data={priceData || []}
            symbol="BTC/USD"
            price={43281.50}
            changePercent={2.45}
            isLoading={priceLoading}
          />

          <TradeHistory trades={trades || []} isLoading={tradesLoading} />
        </div>

        <BacktestingTable
          results={backtestResults || []}
          isLoading={backtestLoading}
          onRunBacktest={handleRunBacktest}
        />
      </main>
    </div>
  );
}
