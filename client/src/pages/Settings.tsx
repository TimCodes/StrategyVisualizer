import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Settings() {
  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Settings"
        subtitle="Configure your trading dashboard and preferences"
      />

      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* General Settings */}
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-text-primary">General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="refresh-interval" className="text-text-primary">
                  Data Refresh Interval
                </Label>
                <Select>
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
                <Switch id="dark-mode" defaultChecked data-testid="switch-dark-mode" />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notifications" className="text-text-primary">
                  Push Notifications
                </Label>
                <Switch id="notifications" data-testid="switch-notifications" />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="auto-refresh" className="text-text-primary">
                  Auto Refresh Data
                </Label>
                <Switch id="auto-refresh" defaultChecked data-testid="switch-auto-refresh" />
              </div>
            </CardContent>
          </Card>

          {/* Trading Settings */}
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
                  placeholder="1000"
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
                  placeholder="2"
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
                  placeholder="10"
                  className="bg-background border-border text-text-primary"
                  data-testid="input-max-positions"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="stop-loss" className="text-text-primary">
                  Auto Stop Loss
                </Label>
                <Switch id="stop-loss" data-testid="switch-stop-loss" />
              </div>
            </CardContent>
          </Card>

          {/* API Settings */}
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-text-primary">API Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="api-key" className="text-text-primary">
                  API Key
                </Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder="Enter your API key"
                  className="bg-background border-border text-text-primary"
                  data-testid="input-api-key"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="api-secret" className="text-text-primary">
                  API Secret
                </Label>
                <Input
                  id="api-secret"
                  type="password"
                  placeholder="Enter your API secret"
                  className="bg-background border-border text-text-primary"
                  data-testid="input-api-secret"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="exchange" className="text-text-primary">
                  Exchange
                </Label>
                <Select>
                  <SelectTrigger data-testid="select-exchange">
                    <SelectValue placeholder="Select exchange" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface border-border">
                    <SelectItem value="binance">Binance</SelectItem>
                    <SelectItem value="coinbase">Coinbase Pro</SelectItem>
                    <SelectItem value="kraken">Kraken</SelectItem>
                    <SelectItem value="alpaca">Alpaca</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button 
                className="w-full bg-primary hover:bg-primary/90 text-white"
                data-testid="button-test-connection"
              >
                Test Connection
              </Button>
            </CardContent>
          </Card>

          {/* Notifications Settings */}
          <Card className="bg-surface border-border">
            <CardHeader>
              <CardTitle className="text-text-primary">Notification Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="trade-alerts" className="text-text-primary">
                  Trade Execution Alerts
                </Label>
                <Switch id="trade-alerts" defaultChecked data-testid="switch-trade-alerts" />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="performance-alerts" className="text-text-primary">
                  Performance Alerts
                </Label>
                <Switch id="performance-alerts" data-testid="switch-performance-alerts" />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="system-alerts" className="text-text-primary">
                  System Status Alerts
                </Label>
                <Switch id="system-alerts" defaultChecked data-testid="switch-system-alerts" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-text-primary">
                  Email Address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="bg-background border-border text-text-primary"
                  data-testid="input-email"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Save Settings */}
        <div className="flex justify-end">
          <Button 
            className="bg-primary hover:bg-primary/90 text-white"
            data-testid="button-save-settings"
          >
            Save Settings
          </Button>
        </div>
      </main>
    </div>
  );
}
