import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SocketProvider } from "@/contexts/SocketContext";
import Sidebar from "@/components/layout/Sidebar";
import Overview from "@/pages/Overview";
import Strategies from "@/pages/Strategies";
import Backtesting from "@/pages/Backtesting";
import Portfolio from "@/pages/Portfolio";
import Markets from "@/pages/Markets";
import Chat from "@/pages/Chat";
import Arena from "@/pages/Arena";
import Settings from "@/pages/Settings";
import EditorPage from "@/pages/Editor";
import NotFound from "@/pages/not-found";
import { AlertTriangle, FlaskConical, Info } from "lucide-react";

function SimulatedModeBanner() {
  const { data } = useQuery<{ liveTradingEnabled: boolean; backtestEngine: string }>({
    queryKey: ["/api/system/status"],
  });

  if (data?.liveTradingEnabled) return null;

  return (
    <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/15 border-b border-yellow-500/40 text-yellow-400 text-sm font-medium shrink-0">
      <AlertTriangle className="h-4 w-4 shrink-0" />
      <span>
        Simulated mode — backtest results are randomly generated and live trading is disabled.
      </span>
    </div>
  );
}

function TrialCounterBanner() {
  const { data } = useQuery<{ total: number; byType: { generation: number; refinement: number; optimization: number } }>({
    queryKey: ["/api/trials/count"],
    refetchInterval: 15000,
  });

  const total = data?.total ?? 0;
  const countColor =
    total === 0
      ? "text-text-secondary"
      : total < 10
      ? "text-text-primary"
      : total < 30
      ? "text-amber-400"
      : "text-orange-400";

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-surface border-b border-border text-sm shrink-0">
      <FlaskConical className="h-3.5 w-3.5 text-text-secondary shrink-0" />
      <span className="text-text-secondary">Trials run:</span>
      <span className={`font-semibold tabular-nums ${countColor}`}>{total}</span>
      {data && (
        <span className="text-text-secondary text-xs">
          ({data.byType.generation}g / {data.byType.refinement}r / {data.byType.optimization}o)
        </span>
      )}
      <Tooltip>
        <TooltipTrigger asChild>
          <Info className="h-3.5 w-3.5 text-text-secondary cursor-help shrink-0" />
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-72 bg-surface border-border text-text-primary text-xs leading-relaxed p-3">
          <p className="font-semibold mb-1">Why this number matters</p>
          <p>
            Each AI generation, refinement, or optimization is another look at the data.
            The more candidates you try, the more likely a good-looking backtest is luck
            rather than edge — around 1 in 20 random tries will look "significant" by chance.
            This count is how you stay honest about that.
          </p>
          <p className="mt-2 text-text-secondary">g = generations · r = refinements · o = optimizations</p>
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/strategies" component={Strategies} />
      <Route path="/editor" component={EditorPage} />
      <Route path="/backtesting" component={Backtesting} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/markets" component={Markets} />
      <Route path="/chat" component={Chat} />
      <Route path="/arena" component={Arena} />
      <Route path="/settings" component={Settings} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>
        <TooltipProvider>
          <div className="flex min-h-screen bg-background text-foreground">
            <Sidebar />
            <div className="flex flex-col flex-1 min-w-0">
              <SimulatedModeBanner />
              <TrialCounterBanner />
              <Router />
            </div>
          </div>
          <Toaster />
        </TooltipProvider>
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;
