import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import MarketChart from "@/components/dashboard/MarketChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TradingService } from "@/services/tradingServices";

export default function Markets() {
  const { data: marketData, isLoading: marketLoading } = useQuery({
    queryKey: ["market-data"],
    queryFn: TradingService.getMarketData,
  });

  const { data: priceData, isLoading: priceLoading } = useQuery({
    queryKey: ["price-data", "BTC/USD"],
    queryFn: () => TradingService.getPriceData("BTC/USD"),
  });

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Market Data"
        subtitle="Real-time market prices and trading instruments"
      />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* Market Overview */}
        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-text-primary">Market Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {marketLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-20 bg-background rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {marketData?.map((market, index) => (
                  <div 
                    key={market.id} 
                    className="p-4 bg-background rounded-lg"
                    data-testid={`market-item-${index}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-text-primary">{market.symbol}</h3>
                        <p className="text-text-secondary text-sm">{market.name}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-text-primary">
                          ${market.price.toLocaleString()}
                        </p>
                        <p className={`text-sm ${
                          market.changePercent > 0 ? 'text-success' : 'text-danger'
                        }`}>
                          {market.changePercent > 0 ? '+' : ''}{market.changePercent.toFixed(2)}%
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-border">
                      <p className="text-text-secondary text-xs">
                        Volume: ${(market.volume / 1e9).toFixed(2)}B
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Price Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {priceData && (
            <MarketChart
              data={priceData}
              symbol="BTC/USD"
              price={43281.50}
              changePercent={2.45}
              isLoading={priceLoading}
            />
          )}
          
          {/* Additional market charts would go here */}
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-text-primary">Market Movers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-text-primary">ETH/USD</span>
                  <span className="text-success">+3.45%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-primary">AAPL</span>
                  <span className="text-success">+2.1%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-primary">TSLA</span>
                  <span className="text-danger">-1.8%</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
