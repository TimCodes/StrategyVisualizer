import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
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
import { AlertTriangle } from "lucide-react";

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
