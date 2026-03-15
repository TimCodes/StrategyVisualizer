import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { PriceData } from "@shared/schema";

interface MarketChartProps {
  data?: PriceData[];
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
  if (isLoading || !data || data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center">
        <div className="animate-pulse text-text-secondary">Loading chart...</div>
      </div>
    );
  }

  const chartData = data.map(d => ({
    time: d.timestamp.toLocaleDateString(),
    price: d.close,
  }));

  const lineColor = changePercent >= 0 ? "hsl(var(--success))" : "hsl(var(--danger))";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-2xl font-bold text-text-primary">
            ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-lg font-semibold ${changePercent >= 0 ? 'text-success' : 'text-danger'}`}>
            {changePercent >= 0 ? '+' : ''}{changePercent.toFixed(2)}%
          </span>
        </div>
      </div>
      <div className="h-[350px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis 
              dataKey="time" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 12 }}
              tickFormatter={(value) => `$${value.toLocaleString()}`}
              domain={['auto', 'auto']}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'hsl(var(--surface))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--text-primary))',
              }}
              formatter={(value: any) => [`$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Price']}
            />
            <Line
              type="monotone"
              dataKey="price"
              stroke={lineColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: lineColor }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
