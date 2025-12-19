import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Play } from "lucide-react";
import { BacktestResult } from "@shared/schema";

interface BacktestingTableProps {
  results?: BacktestResult[];
  isLoading?: boolean;
  onRunBacktest?: () => void;
}

export default function BacktestingTable({ results, isLoading, onRunBacktest }: BacktestingTableProps) {
  if (isLoading || !results) {
    return (
      <Card className="bg-surface border-border">
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-semibold text-text-primary">
              Backtesting Results
            </CardTitle>
            <Button className="bg-primary hover:bg-primary/90 text-white">
              <Play className="mr-2 h-4 w-4" />
              Run New Backtest
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 bg-background rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/20 text-success';
      case 'running':
        return 'bg-warning/20 text-warning';
      case 'failed':
        return 'bg-danger/20 text-danger';
      default:
        return 'bg-border text-text-secondary';
    }
  };

  return (
    <Card className="bg-surface border-border">
      <CardHeader className="border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold text-text-primary">
            Backtesting Results
          </CardTitle>
          <Button 
            onClick={onRunBacktest}
            className="bg-primary hover:bg-primary/90 text-white"
            data-testid="button-run-backtest"
          >
            <Play className="mr-2 h-4 w-4" />
            Run New Backtest
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Strategy
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Period
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Total Return
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Sharpe Ratio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Max DD
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Trades
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.map((result, index) => (
                <tr 
                  key={result.id} 
                  className="hover:bg-background transition-colors"
                  data-testid={`backtest-row-${index}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-text-primary">{result.strategyName}</div>
                    <div className="text-text-secondary text-sm">{result.strategyDescription}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {result.startDate.toLocaleDateString()} to {result.endDate.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`font-medium ${
                      result.totalReturn > 0 ? 'text-success' : 'text-danger'
                    }`}>
                      {result.totalReturn > 0 ? '+' : ''}{result.totalReturn.toFixed(2)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {result.sharpeRatio.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-danger">{result.maxDrawdown.toFixed(2)}%</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                    {result.totalTrades}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge className={`${getStatusColor(result.status)}`}>
                      {result.status.charAt(0).toUpperCase() + result.status.slice(1)}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
