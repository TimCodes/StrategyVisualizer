import { useQuery } from "@tanstack/react-query";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, BarChart2, AlertTriangle, Trophy, ArrowUpDown, FlaskConical } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LeanBacktest, LeanProject } from "@shared/schema";

interface BacktestResultsPanelProps {
  projectName: string | null;
  latestResult?: LeanBacktest | null;
  logs: string[];
  isRunning: boolean;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  positive?: boolean;
  neutral?: boolean;
}

function MetricCard({ label, value, icon, positive, neutral }: MetricCardProps) {
  return (
    <div className="flex flex-col gap-1 p-3 rounded-lg bg-card border border-border">
      <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
        {icon}
        {label}
      </div>
      <div
        className={cn(
          "text-lg font-bold",
          neutral ? "text-foreground" : positive ? "text-green-400" : "text-red-400"
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function BacktestResultsPanel({
  projectName,
  latestResult,
  logs,
  isRunning,
}: BacktestResultsPanelProps) {
  const { data: allResults = [] } = useQuery<LeanBacktest[]>({
    queryKey: ["/api/lean/projects", projectName, "results"],
    queryFn: () =>
      fetch(`/api/lean/projects/${projectName}/results`).then((r) => r.json()),
    enabled: !!projectName,
    refetchInterval: isRunning ? 2000 : false,
  });

  const result = latestResult ?? allResults[0] ?? null;

  const equityCurveData = result?.equityCurve ?? [];

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);

  return (
    <Tabs defaultValue="output" className="flex flex-col h-full">
      <TabsList className="mx-2 mt-2 w-auto self-start">
        <TabsTrigger value="output">Output</TabsTrigger>
        <TabsTrigger value="results">Results</TabsTrigger>
        <TabsTrigger value="history">History</TabsTrigger>
      </TabsList>

      <TabsContent value="output" className="flex-1 overflow-hidden m-0 p-0">
        <div className="h-full overflow-y-auto p-3 font-mono text-xs space-y-0.5 bg-background">
          {logs.length === 0 && !isRunning && (
            <div className="text-muted-foreground italic pt-4 text-center">
              Run a backtest to see output
            </div>
          )}
          {isRunning && logs.length === 0 && (
            <div className="text-yellow-400 animate-pulse">
              Initializing backtest engine...
            </div>
          )}
          {logs.map((line, i) => (
            <div
              key={i}
              className={cn(
                "leading-5",
                line.includes("ERROR") || line.includes("FAIL")
                  ? "text-red-400"
                  : line.includes("WIN") || line.includes("complete")
                  ? "text-green-400"
                  : line.includes("LOSS")
                  ? "text-red-300"
                  : line.includes("BUY") || line.includes("SELL")
                  ? "text-blue-300"
                  : "text-muted-foreground"
              )}
            >
              {line}
            </div>
          ))}
          {isRunning && (
            <div className="text-yellow-400 animate-pulse">Running...</div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="results" className="flex-1 overflow-y-auto m-0 p-3 space-y-4">
        {!result && (
          <div className="text-muted-foreground italic text-center pt-8 text-sm">
            No results yet. Run a backtest to see metrics.
          </div>
        )}

        {result?.status === "running" && (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        )}

        {result && result.status !== "running" && (
          <>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge
                variant={result.status === "completed" ? "default" : "destructive"}
                className="text-xs"
              >
                {result.status}
              </Badge>
              {(result.dataSource === "simulated" || !result.dataSource) && (
                <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-xs gap-1">
                  <FlaskConical className="h-3 w-3" />
                  Simulated
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {new Date(result.runAt).toLocaleString()}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <MetricCard
                label="Total Return"
                value={`${result.totalReturn >= 0 ? "+" : ""}${result.totalReturn.toFixed(2)}%`}
                icon={<TrendingUp className="h-3 w-3" />}
                positive={result.totalReturn >= 0}
              />
              <MetricCard
                label="Sharpe Ratio"
                value={result.sharpeRatio.toFixed(2)}
                icon={<BarChart2 className="h-3 w-3" />}
                neutral={Math.abs(result.sharpeRatio) < 0.5}
                positive={result.sharpeRatio >= 0.5}
              />
              <MetricCard
                label="Max Drawdown"
                value={`${result.maxDrawdown.toFixed(2)}%`}
                icon={<TrendingDown className="h-3 w-3" />}
                positive={result.maxDrawdown > -10}
              />
              <MetricCard
                label="Win Rate"
                value={`${result.winRate.toFixed(1)}%`}
                icon={<Trophy className="h-3 w-3" />}
                positive={result.winRate >= 50}
              />
            </div>

            <div className="p-3 rounded-lg bg-card border border-border">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                <ArrowUpDown className="h-3 w-3" />
                Total Trades
              </div>
              <div className="text-lg font-bold">{result.totalTrades}</div>
            </div>

            {equityCurveData.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground font-medium">Equity Curve</p>
                <div className="h-36 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={equityCurveData}
                      margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                    >
                      <defs>
                        <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop
                            offset="5%"
                            stopColor={
                              result.totalReturn >= 0 ? "#22c55e" : "#ef4444"
                            }
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor={
                              result.totalReturn >= 0 ? "#22c55e" : "#ef4444"
                            }
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                        width={40}
                      />
                      <Tooltip
                        formatter={(v: number) => [formatCurrency(v), "Equity"]}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                        contentStyle={{
                          backgroundColor: "hsl(var(--popover))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "6px",
                          fontSize: "11px",
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke={result.totalReturn >= 0 ? "#22c55e" : "#ef4444"}
                        strokeWidth={1.5}
                        fill="url(#equityGrad)"
                        dot={false}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {result.status === "failed" && result.errorLog && (
              <div className="rounded-lg bg-destructive/10 border border-destructive/30 p-3">
                <div className="flex items-center gap-2 text-destructive text-xs font-medium mb-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Error
                </div>
                <p className="text-xs text-muted-foreground font-mono">
                  {result.errorLog}
                </p>
              </div>
            )}
          </>
        )}
      </TabsContent>

      <TabsContent value="history" className="flex-1 overflow-y-auto m-0 p-3">
        {allResults.length === 0 && (
          <div className="text-muted-foreground italic text-center pt-8 text-sm">
            No backtest history yet.
          </div>
        )}
        <div className="space-y-2">
          {allResults.map((bt) => (
            <div
              key={bt.id}
              className="p-3 rounded-lg bg-card border border-border space-y-1"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Badge
                    variant={bt.status === "completed" ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {bt.status}
                  </Badge>
                  {(bt.dataSource === "simulated" || !bt.dataSource) && (
                    <Badge className="bg-yellow-500/15 text-yellow-400 border border-yellow-500/30 text-xs gap-1">
                      <FlaskConical className="h-3 w-3" />
                      Simulated
                    </Badge>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(bt.runAt).toLocaleString()}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                <div>
                  <span className="text-muted-foreground">Return: </span>
                  <span
                    className={
                      bt.totalReturn >= 0 ? "text-green-400" : "text-red-400"
                    }
                  >
                    {bt.totalReturn >= 0 ? "+" : ""}
                    {bt.totalReturn.toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Sharpe: </span>
                  <span>{bt.sharpeRatio.toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Win: </span>
                  <span>{bt.winRate.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </TabsContent>
    </Tabs>
  );
}
