import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, AlertCircle, XCircle } from "lucide-react";

interface RiskSettings {
  maxPositionSize: number;
  maxTotalPositions: number;
  maxDrawdown: number;
  dailyLossLimit: number;
}

interface PortfolioState {
  totalValue: number;
  positionCount: number;
  currentDrawdown: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  largestPosition?: {
    symbol: string;
    value: number;
    percent: number;
  };
}

interface RiskWidgetProps {
  settings: RiskSettings;
  portfolio: PortfolioState;
}

type RiskLevel = "normal" | "warning" | "danger" | "critical";

function getRiskLevel(current: number, max: number): RiskLevel {
  const percent = (current / max) * 100;
  if (percent >= 100) return "critical";
  if (percent >= 75) return "danger";
  if (percent >= 50) return "warning";
  return "normal";
}

const RISK_COLORS: Record<RiskLevel, string> = {
  normal: "text-green-500",
  warning: "text-yellow-500",
  danger: "text-orange-500",
  critical: "text-red-500",
};

const RISK_BG_COLORS: Record<RiskLevel, string> = {
  normal: "bg-green-500",
  warning: "bg-yellow-500",
  danger: "bg-orange-500",
  critical: "bg-red-500",
};

const RISK_ICONS: Record<RiskLevel, typeof CheckCircle> = {
  normal: CheckCircle,
  warning: AlertTriangle,
  danger: AlertCircle,
  critical: XCircle,
};

interface RiskMeterProps {
  label: string;
  current: number;
  max: number;
  format?: (value: number) => string;
  suffix?: string;
}

function RiskMeter({ label, current, max, format, suffix = "" }: RiskMeterProps) {
  const level = getRiskLevel(Math.abs(current), max);
  const percent = Math.min(100, (Math.abs(current) / max) * 100);

  const formatValue = format || ((v: number) => v.toFixed(1));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className={RISK_COLORS[level]}>
          {formatValue(current)}{suffix} / {formatValue(max)}{suffix}
        </span>
      </div>
      <Progress
        value={percent}
        className={`h-2 ${level !== "normal" ? `[&>div]:${RISK_BG_COLORS[level]}` : ""}`}
      />
    </div>
  );
}

export function RiskWidget({ settings, portfolio }: RiskWidgetProps) {
  const drawdownLevel = getRiskLevel(portfolio.currentDrawdown, settings.maxDrawdown);
  const dailyLossLevel = getRiskLevel(
    Math.abs(Math.min(0, portfolio.dailyPnLPercent)),
    settings.dailyLossLimit
  );
  const positionLevel = getRiskLevel(portfolio.positionCount, settings.maxTotalPositions);

  const overallLevel: RiskLevel =
    drawdownLevel === "critical" || dailyLossLevel === "critical"
      ? "critical"
      : drawdownLevel === "danger" || dailyLossLevel === "danger"
        ? "danger"
        : drawdownLevel === "warning" || dailyLossLevel === "warning"
          ? "warning"
          : "normal";

  const StatusIcon = RISK_ICONS[overallLevel];

  const statusMessages: Record<RiskLevel, string> = {
    normal: "All systems normal",
    warning: "Approaching risk limits",
    danger: "Risk levels elevated",
    critical: "Trading may be restricted",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5" />
          Risk Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <RiskMeter
          label="Drawdown"
          current={portfolio.currentDrawdown}
          max={settings.maxDrawdown}
          suffix="%"
        />

        <RiskMeter
          label="Daily P&L"
          current={Math.min(0, portfolio.dailyPnLPercent)}
          max={settings.dailyLossLimit}
          format={(v) => (v < 0 ? v.toFixed(1) : "0.0")}
          suffix="%"
        />

        <RiskMeter
          label="Positions"
          current={portfolio.positionCount}
          max={settings.maxTotalPositions}
          format={(v) => Math.round(v).toString()}
        />

        {portfolio.largestPosition && (
          <div className="text-sm">
            <span className="text-muted-foreground">Largest Position: </span>
            <span className="font-medium">
              {portfolio.largestPosition.symbol}{" "}
              ${portfolio.largestPosition.value.toLocaleString()} (
              {portfolio.largestPosition.percent.toFixed(1)}%)
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 pt-2 border-t">
          <StatusIcon className={`h-4 w-4 ${RISK_COLORS[overallLevel]}`} />
          <Badge
            variant="outline"
            className={RISK_COLORS[overallLevel]}
          >
            {statusMessages[overallLevel]}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export function RiskWidgetSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <AlertTriangle className="h-5 w-5" />
          Risk Monitor
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-1">
            <div className="flex items-center justify-between">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-16 bg-muted animate-pulse rounded" />
            </div>
            <div className="h-2 w-full bg-muted animate-pulse rounded" />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
