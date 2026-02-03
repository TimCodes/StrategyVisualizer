import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
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
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Overview} />
      <Route path="/strategies" component={Strategies} />
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
            <Router />
          </div>
          <Toaster />
        </TooltipProvider>
      </SocketProvider>
    </QueryClientProvider>
  );
}

export default App;
