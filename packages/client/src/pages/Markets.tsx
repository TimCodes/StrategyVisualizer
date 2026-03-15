import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import MarketChart from "@/components/dashboard/MarketChart";
import OrderBook from "@/components/markets/OrderBook";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TradingService } from "@/services/tradingServices";
import { RefreshCw } from "lucide-react";

const TIMEFRAME_OPTIONS = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "90D", days: 90 },
  { label: "1Y", days: 365 },
];

export default function Markets() {
  const [selectedSymbol, setSelectedSymbol] = useState("BTC/USD");
  const [selectedDays, setSelectedDays] = useState(30);

  const { data: marketData, isLoading: marketLoading, refetch: refetchMarkets } = useQuery({
    queryKey: ["market-data"],
    queryFn: TradingService.getMarketData,
    refetchInterval: 60000,
  });

  const { data: priceData, isLoading: priceLoading, refetch: refetchPrice } = useQuery({
    queryKey: ["price-data", selectedSymbol, selectedDays],
    queryFn: () => TradingService.getPriceData(selectedSymbol, selectedDays),
    refetchInterval: 60000,
  });

  const selectedMarket = marketData?.find(m => m.symbol === selectedSymbol);

  const handleRefresh = () => {
    refetchMarkets();
    refetchPrice();
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Market Data"
        subtitle="Live cryptocurrency prices from CoinGecko"
      />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-success border-success">
              Live Data
            </Badge>
            <span className="text-text-secondary text-sm">Auto-refreshes every minute</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="flex items-center gap-2"
            data-testid="button-refresh-markets"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        <Card className="bg-surface border-border">
          <CardHeader>
            <CardTitle className="text-text-primary">Market Overview</CardTitle>
          </CardHeader>
          <CardContent>
            {marketLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-24 bg-background rounded-lg"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {(marketData || []).map((market, index) => (
                  <div 
                    key={market.id} 
                    className={`p-4 rounded-lg cursor-pointer transition-all ${
                      selectedSymbol === market.symbol 
                        ? "bg-primary/10 border-2 border-primary" 
                        : "bg-background hover:bg-background/80"
                    }`}
                    onClick={() => setSelectedSymbol(market.symbol)}
                    data-testid={`market-item-${index}`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-text-primary">{market.symbol}</h3>
                        <p className="text-text-secondary text-sm">{market.name}</p>
                      </div>
                    </div>
                    <div className="mt-2">
                      <p className="font-bold text-text-primary text-lg">
                        ${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </p>
                      <p className={`text-sm font-medium ${
                        market.changePercent > 0 ? 'text-success' : 'text-danger'
                      }`}>
                        {market.changePercent > 0 ? '+' : ''}{market.changePercent.toFixed(2)}%
                      </p>
                    </div>
                    <div className="mt-2 pt-2 border-t border-border">
                      <p className="text-text-secondary text-xs">
                        Vol: ${(market.volume / 1e9).toFixed(2)}B
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-surface border-border">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-text-primary">
              Price Chart - {selectedSymbol}
            </CardTitle>
            <div className="flex gap-2">
              {TIMEFRAME_OPTIONS.map((tf) => (
                <Button
                  key={tf.days}
                  variant={selectedDays === tf.days ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDays(tf.days)}
                  data-testid={`button-timeframe-${tf.label}`}
                >
                  {tf.label}
                </Button>
              ))}
            </div>
          </CardHeader>
          <CardContent>
            <MarketChart
              data={priceData || []}
              symbol={selectedSymbol}
              price={selectedMarket?.price || 0}
              changePercent={selectedMarket?.changePercent || 0}
              isLoading={priceLoading}
            />
          </CardContent>
        </Card>

        <OrderBook symbol={selectedSymbol} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-text-primary">Top Gainers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(marketData || [])
                  .filter(m => m.changePercent > 0)
                  .sort((a, b) => b.changePercent - a.changePercent)
                  .slice(0, 3)
                  .map((market, index) => (
                    <div 
                      key={market.id} 
                      className="flex justify-between items-center p-2 rounded hover:bg-background cursor-pointer"
                      onClick={() => setSelectedSymbol(market.symbol)}
                      data-testid={`gainer-${index}`}
                    >
                      <div>
                        <span className="text-text-primary font-medium">{market.symbol}</span>
                        <p className="text-text-secondary text-xs">{market.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-success font-semibold">+{market.changePercent.toFixed(2)}%</span>
                        <p className="text-text-secondary text-xs">${market.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                {(marketData || []).filter(m => m.changePercent > 0).length === 0 && (
                  <p className="text-text-secondary text-sm">No gainers today</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-text-primary">Top Losers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(marketData || [])
                  .filter(m => m.changePercent < 0)
                  .sort((a, b) => a.changePercent - b.changePercent)
                  .slice(0, 3)
                  .map((market, index) => (
                    <div 
                      key={market.id} 
                      className="flex justify-between items-center p-2 rounded hover:bg-background cursor-pointer"
                      onClick={() => setSelectedSymbol(market.symbol)}
                      data-testid={`loser-${index}`}
                    >
                      <div>
                        <span className="text-text-primary font-medium">{market.symbol}</span>
                        <p className="text-text-secondary text-xs">{market.name}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-danger font-semibold">{market.changePercent.toFixed(2)}%</span>
                        <p className="text-text-secondary text-xs">${market.price.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                {(marketData || []).filter(m => m.changePercent < 0).length === 0 && (
                  <p className="text-text-secondary text-sm">No losers today</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
