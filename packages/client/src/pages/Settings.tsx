import { useQuery, useMutation } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Settings as SettingsType } from "@shared/schema";
import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function Settings() {
  const { toast } = useToast();
  
  const { data: settings, isLoading } = useQuery<SettingsType>({
    queryKey: ["/api/settings"],
  });

  const { data: ibkrStatus } = useQuery<{
    configured: boolean;
    authenticated: boolean;
    message?: string;
  }>({
    queryKey: ["/api/ibkr/status"],
    refetchInterval: 30000,
  });

  const [formState, setFormState] = useState<Partial<SettingsType>>({});

  useEffect(() => {
    if (settings) {
      setFormState(settings);
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SettingsType>) => {
      const response = await apiRequest("PUT", "/api/settings", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settings"] });
      toast({
        title: "Settings saved",
        description: "Your preferences have been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save settings. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateMutation.mutate(formState);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col">
        <Header
          title="Settings"
          subtitle="Configure your trading dashboard and preferences"
        />
        <main className="flex-1 p-6 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Settings"
        subtitle="Configure your trading dashboard and preferences"
      />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-text-primary">General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="refresh-interval" className="text-text-primary">
                  Data Refresh Interval
                </Label>
                <Select
                  value={formState.refreshInterval || "30s"}
                  onValueChange={(value) => setFormState({ ...formState, refreshInterval: value as any })}
                >
                  <SelectTrigger data-testid="select-refresh-interval">
                    <SelectValue placeholder="Select interval" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    <SelectItem value="5s">5 seconds</SelectItem>
                    <SelectItem value="10s">10 seconds</SelectItem>
                    <SelectItem value="30s">30 seconds</SelectItem>
                    <SelectItem value="1m">1 minute</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="dark-mode" className="text-text-primary">
                  Dark Mode
                </Label>
                <Switch
                  id="dark-mode"
                  checked={formState.darkMode ?? true}
                  onCheckedChange={(checked) => setFormState({ ...formState, darkMode: checked })}
                  data-testid="switch-dark-mode"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className="text-text-primary">
                  Push Notifications
                </Label>
                <Switch
                  id="notifications"
                  checked={formState.notifications ?? false}
                  onCheckedChange={(checked) => setFormState({ ...formState, notifications: checked })}
                  data-testid="switch-notifications"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-refresh" className="text-text-primary">
                  Auto Refresh Data
                </Label>
                <Switch
                  id="auto-refresh"
                  checked={formState.autoRefresh ?? true}
                  onCheckedChange={(checked) => setFormState({ ...formState, autoRefresh: checked })}
                  data-testid="switch-auto-refresh"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-text-primary">Trading Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="default-position-size" className="text-text-primary">
                  Default Position Size
                </Label>
                <Input
                  id="default-position-size"
                  type="number"
                  value={formState.defaultPositionSize ?? 1000}
                  onChange={(e) => setFormState({ ...formState, defaultPositionSize: Number(e.target.value) })}
                  className="bg-background border-border text-text-primary"
                  data-testid="input-position-size"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="risk-limit" className="text-text-primary">
                  Risk Limit (%)
                </Label>
                <Input
                  id="risk-limit"
                  type="number"
                  value={formState.riskLimit ?? 2}
                  onChange={(e) => setFormState({ ...formState, riskLimit: Number(e.target.value) })}
                  className="bg-background border-border text-text-primary"
                  data-testid="input-risk-limit"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-positions" className="text-text-primary">
                  Maximum Open Positions
                </Label>
                <Input
                  id="max-positions"
                  type="number"
                  value={formState.maxPositions ?? 10}
                  onChange={(e) => setFormState({ ...formState, maxPositions: Number(e.target.value) })}
                  className="bg-background border-border text-text-primary"
                  data-testid="input-max-positions"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="stop-loss" className="text-text-primary">
                  Auto Stop Loss
                </Label>
                <Switch
                  id="stop-loss"
                  checked={formState.autoStopLoss ?? false}
                  onCheckedChange={(checked) => setFormState({ ...formState, autoStopLoss: checked })}
                  data-testid="switch-stop-loss"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-text-primary">API Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="exchange" className="text-text-primary">
                  Exchange
                </Label>
                <Select
                  value={formState.exchange || "coingecko"}
                  onValueChange={(value) => setFormState({ ...formState, exchange: value as any })}
                >
                  <SelectTrigger data-testid="select-exchange">
                    <SelectValue placeholder="Select exchange" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    <SelectItem value="coingecko">CoinGecko (Free API)</SelectItem>
                    <SelectItem value="kraken">Kraken</SelectItem>
                    <SelectItem value="ibkr">Interactive Brokers</SelectItem>
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="coinbase">Coinbase Pro</SelectItem>
                    <SelectItem value="alpaca">Alpaca</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-text-secondary mt-1">
                  {formState.exchange === "kraken" && "Live market data from Kraken exchange. API keys optional for market data."}
                  {formState.exchange === "coingecko" && "Free aggregated market data from CoinGecko."}
                  {formState.exchange === "ibkr" && "Interactive Brokers — stocks, ETFs, options, and futures via Client Portal API."}
                  {formState.exchange === "binance" && "Binance exchange (coming soon)"}
                  {formState.exchange === "coinbase" && "Coinbase Pro exchange (coming soon)"}
                  {formState.exchange === "alpaca" && "Alpaca for stocks and crypto (coming soon)"}
                  {!formState.exchange && "Select an exchange for market data."}
                </p>
              </div>

              {formState.exchange === "ibkr" && (
                <div className="rounded-md border border-border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-text-primary">IBKR Connection Status</span>
                    {ibkrStatus?.configured ? (
                      ibkrStatus.authenticated ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Connected
                        </Badge>
                      ) : (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Session Expired
                        </Badge>
                      )
                    ) : (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> Not Configured
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1 text-xs text-text-secondary">
                    <p className="font-medium text-text-primary text-sm">Required environment secrets:</p>
                    <div className="font-mono bg-background rounded px-2 py-1 space-y-1">
                      <p>IBKR_ACCESS_TOKEN — OAuth2 Bearer token from IBKR</p>
                      <p>IBKR_ACCOUNT_ID — Your IBKR account number</p>
                    </div>
                    <p className="pt-1">
                      Obtain your access token via the{" "}
                      <a
                        href="https://www.interactivebrokers.com/en/trading/ib-api.php"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2"
                      >
                        IBKR Client Portal API
                      </a>
                      . Add them as secrets in your Replit environment.
                    </p>
                  </div>
                </div>
              )}

              <p className="text-sm text-text-secondary">
                For Kraken trading, add KRAKEN_API_KEY and KRAKEN_API_SECRET. For IBKR, add IBKR_ACCESS_TOKEN and IBKR_ACCOUNT_ID.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-text-primary">Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="trade-alerts" className="text-text-primary">
                  Trade Execution Alerts
                </Label>
                <Switch
                  id="trade-alerts"
                  checked={formState.tradeAlerts ?? true}
                  onCheckedChange={(checked) => setFormState({ ...formState, tradeAlerts: checked })}
                  data-testid="switch-trade-alerts"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="performance-alerts" className="text-text-primary">
                  Performance Alerts
                </Label>
                <Switch
                  id="performance-alerts"
                  checked={formState.performanceAlerts ?? false}
                  onCheckedChange={(checked) => setFormState({ ...formState, performanceAlerts: checked })}
                  data-testid="switch-performance-alerts"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="system-alerts" className="text-text-primary">
                  System Status Alerts
                </Label>
                <Switch
                  id="system-alerts"
                  checked={formState.systemAlerts ?? true}
                  onCheckedChange={(checked) => setFormState({ ...formState, systemAlerts: checked })}
                  data-testid="switch-system-alerts"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-text-primary">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formState.email ?? ""}
                  onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                  placeholder="your@email.com"
                  className="bg-background border-border text-text-primary"
                  data-testid="input-email"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex justify-end">
          <Button 
            className="bg-primary hover:bg-primary/90 text-white"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            data-testid="button-save-settings"
          >
            {updateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              "Save Settings"
            )}
          </Button>
        </div>
      </main>
    </div>
  );
}
