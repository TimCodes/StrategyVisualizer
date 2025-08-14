import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PriceData } from "@shared/schema";

interface MarketChartProps {
  data: PriceData[];
  symbol: string;
  price: number;
  changePercent: number;
  isLoading?: boolean;
}

export default function MarketChart({ 
  data, 
  symbol, 
  price, 
  changePercent, 
  isLoading 
}: MarketChartProps) {
  if (isLoading) {
    return (
      <Card className="bg-surface border-border">
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg font-semibold text-text-primary">
            Market Data - {symbol}
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

  const chartData = data.map(d => ({
    time: d.timestamp.toLocaleDateString(),
    price: d.close,
  }));

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-text-primary">
            Market Data - {symbol}
          </CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-text-secondary text-sm">
              ${price.toLocaleString()}
            </span>
            <span className={`text-sm ${changePercent > 0 ? 'text-success' : 'text-danger'}`}>
              {changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis 
                dataKey="time" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12 }}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12 }}
                tickFormatter={(value) => `$${value.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={{
                  backgroundColor: 'hsl(var(--surface))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--text-primary))',
                }}
                formatter={(value: any) => [`$${value.toLocaleString()}`, 'Price']}
              />
              <Line
                type="monotone"
                dataKey="price"
                stroke="hsl(var(--warning))"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: 'hsl(var(--warning))' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
