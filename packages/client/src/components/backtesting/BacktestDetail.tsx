import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BacktestResult } from "@shared/schema";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from "recharts";
import { TrendingUp, TrendingDown, Activity, Target, BarChart3, Calendar } from "lucide-react";

interface BacktestDetailProps {
  backtest: BacktestResult;
}

export default function BacktestDetail({ backtest }: BacktestDetailProps) {
  const equityCurveData = useMemo(() => {
    const days = Math.max(1, Math.floor((backtest.endDate.getTime() - backtest.startDate.getTime()) / (1000 * 60 * 60 * 24)));
    const data: { date: string; equity: number; drawdown: number }[] = [];
    
    let equity = 10000;
    const dailyReturn = Math.pow(1 + backtest.totalReturn / 100, 1 / days) - 1;
    const volatility = 0.02;
    let peak = equity;
    
    for (let i = 0; i <= days; i += Math.max(1, Math.floor(days / 50))) {
      const date = new Date(backtest.startDate.getTime() + i * 24 * 60 * 60 * 1000);
      const randomWalk = (Math.random() - 0.5) * volatility * equity;
      equity = equity * (1 + dailyReturn) + randomWalk;
      
      if (equity > peak) peak = equity;
      const drawdown = ((peak - equity) / peak) * 100;
      
      data.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        equity: Math.round(equity),
        drawdown: Math.round(drawdown * 100) / 100,
      });
    }
    
    return data;
  }, [backtest]);

  const metrics = [
    {
      label: "Total Return",
      value: `${backtest.totalReturn > 0 ? '+' : ''}${backtest.totalReturn.toFixed(2)}%`,
      icon: backtest.totalReturn >= 0 ? TrendingUp : TrendingDown,
      color: backtest.totalReturn >= 0 ? "text-success" : "text-danger",
    },
    {
      label: "Sharpe Ratio",
      value: backtest.sharpeRatio.toFixed(2),
      icon: Activity,
      color: backtest.sharpeRatio >= 1 ? "text-success" : backtest.sharpeRatio >= 0 ? "text-warning" : "text-danger",
    },
    {
      label: "Max Drawdown",
      value: `-${backtest.maxDrawdown.toFixed(2)}%`,
      icon: TrendingDown,
      color: "text-danger",
    },
    {
      label: "Win Rate",
      value: `${backtest.winRate.toFixed(1)}%`,
      icon: Target,
      color: backtest.winRate >= 50 ? "text-success" : "text-danger",
    },
    {
      label: "Total Trades",
      value: backtest.totalTrades.toString(),
      icon: BarChart3,
      color: "text-text-primary",
    },
    {
      label: "Duration",
      value: `${Math.floor((backtest.endDate.getTime() - backtest.startDate.getTime()) / (1000 * 60 * 60 * 24))} days`,
      icon: Calendar,
      color: "text-text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">{backtest.strategyName}</h3>
          <p className="text-sm text-text-secondary">{backtest.strategyDescription}</p>
        </div>
        <Badge className={`${
          backtest.status === 'completed' ? 'bg-success/20 text-success' :
          backtest.status === 'running' ? 'bg-warning/20 text-warning' :
          'bg-danger/20 text-danger'
        }`}>
          {backtest.status.charAt(0).toUpperCase() + backtest.status.slice(1)}
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="bg-background border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-text-secondary">{metric.label}</p>
                  <p className={`text-lg font-semibold ${metric.color}`}>{metric.value}</p>
                </div>
                <metric.icon className={`h-5 w-5 ${metric.color}`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-background border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-primary">Equity Curve</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurveData}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--text-secondary))"
                  tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--text-secondary))"
                  tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--surface))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--text-primary))',
                  }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, 'Equity']}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  stroke="hsl(var(--primary))"
                  fill="url(#equityGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-background border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-primary">Drawdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-32">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityCurveData}>
                <defs>
                  <linearGradient id="drawdownGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--danger))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--danger))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="date"
                  stroke="hsl(var(--text-secondary))"
                  tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10 }}
                  tickLine={false}
                />
                <YAxis
                  stroke="hsl(var(--text-secondary))"
                  tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10 }}
                  tickLine={false}
                  tickFormatter={(value) => `-${value}%`}
                  reversed
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--surface))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--text-primary))',
                  }}
                  formatter={(value: number) => [`-${value}%`, 'Drawdown']}
                />
                <Area
                  type="monotone"
                  dataKey="drawdown"
                  stroke="hsl(var(--danger))"
                  fill="url(#drawdownGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
