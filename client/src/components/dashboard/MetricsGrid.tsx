import { TrendingUp, TrendingDown, BarChart3, Percent } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { PortfolioMetrics } from "@shared/schema";

interface MetricsGridProps {
  metrics: PortfolioMetrics;
  isLoading?: boolean;
}

export default function MetricsGrid({ metrics, isLoading }: MetricsGridProps) {
  const metricsData = [
    {
      title: "Total Return",
      value: `+${metrics.totalReturnPercent.toFixed(2)}%`,
      subtitle: "vs benchmark: +8.4%",
      icon: TrendingUp,
      iconBg: "bg-success/20",
      iconColor: "text-success",
      valueColor: "text-success",
    },
    {
      title: "Sharpe Ratio",
      value: metrics.sharpeRatio.toFixed(2),
      subtitle: "Risk-adjusted return",
      icon: BarChart3,
      iconBg: "bg-primary/20",
      iconColor: "text-primary",
      valueColor: "text-text-primary",
    },
    {
      title: "Max Drawdown",
      value: `${metrics.maxDrawdown.toFixed(2)}%`,
      subtitle: "Worst decline",
      icon: TrendingDown,
      iconBg: "bg-danger/20",
      iconColor: "text-danger",
      valueColor: "text-danger",
    },
    {
      title: "Win Rate",
      value: `${metrics.winRate.toFixed(1)}%`,
      subtitle: "Successful trades",
      icon: Percent,
      iconBg: "bg-warning/20",
      iconColor: "text-warning",
      valueColor: "text-text-primary",
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="bg-surface border-border">
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="h-4 bg-border rounded w-24 mb-2"></div>
                    <div className="h-8 bg-border rounded w-20 mb-1"></div>
                    <div className="h-3 bg-border rounded w-32"></div>
                  </div>
                  <div className="w-12 h-12 bg-border rounded-full"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricsData.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <Card 
            key={metric.title} 
            className="metric-card bg-surface border-border"
            data-testid={`metric-card-${index}`}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-text-secondary text-sm">{metric.title}</p>
                  <p className={`text-2xl font-bold ${metric.valueColor}`}>
                    {metric.value}
                  </p>
                  <p className="text-text-secondary text-xs mt-1">
                    {metric.subtitle}
                  </p>
                </div>
                <div className={`w-12 h-12 ${metric.iconBg} rounded-full flex items-center justify-center`}>
                  <Icon className={`${metric.iconColor} w-5 h-5`} />
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
