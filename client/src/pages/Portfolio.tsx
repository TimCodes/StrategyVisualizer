import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import MetricsGrid from "@/components/dashboard/MetricsGrid";
import PerformanceChart from "@/components/dashboard/PerformanceChart";
import TradeHistory from "@/components/dashboard/TradeHistory";
import { TradingService } from "@/services/tradingServices";

export default function Portfolio() {
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

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Portfolio Analytics"
        subtitle="Monitor your portfolio performance and trade history"
      />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <MetricsGrid metrics={metrics} isLoading={metricsLoading} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <PerformanceChart
            data={performanceData || []}
            isLoading={performanceLoading}
          />

          <TradeHistory trades={trades || []} isLoading={tradesLoading} />
        </div>
      </main>
    </div>
  );
}
