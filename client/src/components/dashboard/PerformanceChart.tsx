import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { PerformanceData } from "@shared/schema";

interface PerformanceChartProps {
  data?: PerformanceData[];
  isLoading?: boolean;
}

export default function PerformanceChart({ data, isLoading }: PerformanceChartProps) {
  if (isLoading || !data) {
    return (
      <Card className="lg:col-span-2 bg-surface border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg font-semibold text-text-primary">
            Strategy Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="h-[400px] flex items-center justify-center">
            <div className="animate-pulse text-text-secondary">Loading chart...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = data.map(d => {
    const dateObj = typeof d.date === 'string' ? new Date(d.date) : d.date;
    return {
      date: dateObj.toLocaleDateString('en-US', { month: 'short' }),
      portfolio: d.portfolioValue,
      benchmark: d.benchmarkValue,
    };
  });

  return (
    <Card className="lg:col-span-2 bg-surface border-border">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-text-primary">
            Strategy Performance
          </CardTitle>
          <div className="flex space-x-2">
            <Button 
              size="sm" 
              className="bg-primary text-white hover:bg-primary/90"
              data-testid="button-cumulative"
            >
              Cumulative
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-background text-text-secondary border-border hover:bg-border"
              data-testid="button-drawdown"
            >
              Drawdown
            </Button>
            <Button 
              size="sm" 
              variant="outline" 
              className="bg-background text-text-secondary border-border hover:bg-border"
              data-testid="button-returns"
            >
              Returns
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--surface))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--text-primary))',
                }}
                formatter={(value: any, name: string) => [
                  `${value.toFixed(2)}%`,
                  name === 'portfolio' ? 'Strategy Performance' : 'Benchmark (S&P 500)'
                ]}
              />
              <Legend 
                wrapperStyle={{ color: 'hsl(var(--text-primary))' }}
              />
              <Line
                type="monotone"
                dataKey="portfolio"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--primary))' }}
                name="Strategy Performance"
              />
              <Line
                type="monotone"
                dataKey="benchmark"
                stroke="hsl(var(--text-secondary))"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--text-secondary))' }}
                name="Benchmark (S&P 500)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
