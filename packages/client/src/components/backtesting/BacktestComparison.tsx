import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BacktestResult } from "@shared/schema";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
} from "recharts";

interface BacktestComparisonProps {
  backtests: BacktestResult[];
}

const COLORS = [
  "hsl(var(--primary))",
  "hsl(var(--success))",
  "hsl(var(--warning))",
  "hsl(var(--danger))",
];

export default function BacktestComparison({ backtests }: BacktestComparisonProps) {
  const metricsData = [
    {
      metric: "Total Return (%)",
      ...Object.fromEntries(backtests.map((b, i) => [`backtest${i}`, b.totalReturn])),
    },
    {
      metric: "Sharpe Ratio",
      ...Object.fromEntries(backtests.map((b, i) => [`backtest${i}`, b.sharpeRatio])),
    },
    {
      metric: "Win Rate (%)",
      ...Object.fromEntries(backtests.map((b, i) => [`backtest${i}`, b.winRate])),
    },
    {
      metric: "Max Drawdown (%)",
      ...Object.fromEntries(backtests.map((b, i) => [`backtest${i}`, -b.maxDrawdown])),
    },
  ];

  const normalizeValue = (value: number, min: number, max: number) => {
    if (max === min) return 50;
    return ((value - min) / (max - min)) * 100;
  };

  const radarData = [
    {
      metric: "Return",
      ...Object.fromEntries(backtests.map((b, i) => [
        `backtest${i}`,
        normalizeValue(b.totalReturn, -50, 100)
      ])),
    },
    {
      metric: "Sharpe",
      ...Object.fromEntries(backtests.map((b, i) => [
        `backtest${i}`,
        normalizeValue(b.sharpeRatio, -2, 3)
      ])),
    },
    {
      metric: "Win Rate",
      ...Object.fromEntries(backtests.map((b, i) => [
        `backtest${i}`,
        b.winRate
      ])),
    },
    {
      metric: "Low DD",
      ...Object.fromEntries(backtests.map((b, i) => [
        `backtest${i}`,
        100 - b.maxDrawdown
      ])),
    },
    {
      metric: "Trades",
      ...Object.fromEntries(backtests.map((b, i) => [
        `backtest${i}`,
        normalizeValue(b.totalTrades, 0, 200)
      ])),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-background border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-primary">Metrics Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metricsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" stroke="hsl(var(--text-secondary))" tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10 }} />
                  <YAxis type="category" dataKey="metric" stroke="hsl(var(--text-secondary))" tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10 }} width={100} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--surface))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--text-primary))',
                    }}
                  />
                  <Legend />
                  {backtests.map((b, i) => (
                    <Bar
                      key={b.id}
                      dataKey={`backtest${i}`}
                      name={b.strategyName}
                      fill={COLORS[i % COLORS.length]}
                    />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-background border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-text-primary">Performance Radar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="hsl(var(--border))" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10 }} />
                  <PolarRadiusAxis tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 8 }} />
                  {backtests.map((b, i) => (
                    <Radar
                      key={b.id}
                      name={b.strategyName}
                      dataKey={`backtest${i}`}
                      stroke={COLORS[i % COLORS.length]}
                      fill={COLORS[i % COLORS.length]}
                      fillOpacity={0.2}
                    />
                  ))}
                  <Legend />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--surface))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--text-primary))',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-background border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-text-primary">Summary Table</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 text-text-secondary font-medium">Strategy</th>
                  <th className="text-right py-2 text-text-secondary font-medium">Return</th>
                  <th className="text-right py-2 text-text-secondary font-medium">Sharpe</th>
                  <th className="text-right py-2 text-text-secondary font-medium">Win Rate</th>
                  <th className="text-right py-2 text-text-secondary font-medium">Max DD</th>
                  <th className="text-right py-2 text-text-secondary font-medium">Trades</th>
                </tr>
              </thead>
              <tbody>
                {backtests.map((b, i) => (
                  <tr key={b.id} className="border-b border-border/50">
                    <td className="py-2 text-text-primary">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        {b.strategyName}
                        {(b.dataSource === "simulated" || !b.dataSource) && (
                          <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-xs">
                            Simulated
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className={`py-2 text-right ${b.totalReturn >= 0 ? 'text-success' : 'text-danger'}`}>
                      {b.totalReturn > 0 ? '+' : ''}{b.totalReturn.toFixed(2)}%
                    </td>
                    <td className="py-2 text-right text-text-primary">{b.sharpeRatio.toFixed(2)}</td>
                    <td className="py-2 text-right text-text-primary">{b.winRate.toFixed(1)}%</td>
                    <td className="py-2 text-right text-danger">-{b.maxDrawdown.toFixed(2)}%</td>
                    <td className="py-2 text-right text-text-primary">{b.totalTrades}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
