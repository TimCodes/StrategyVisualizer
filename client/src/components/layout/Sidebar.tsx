import { Link, useLocation } from "wouter";
import { BarChart3, Bot, History, Briefcase, Globe, Settings, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  {
    name: "Overview",
    href: "/",
    icon: BarChart3,
  },
  {
    name: "Strategies",
    href: "/strategies",
    icon: Bot,
  },
  {
    name: "Backtesting",
    href: "/backtesting",
    icon: History,
  },
  {
    name: "Portfolio",
    href: "/portfolio",
    icon: Briefcase,
  },
  {
    name: "Markets",
    href: "/markets",
    icon: Globe,
  },
  {
    name: "AI Chat",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-surface border-r border-border flex-shrink-0">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="text-white text-sm" />
          </div>
          <h1 className="text-xl font-bold text-text-primary">TradingView</h1>
        </div>
        
        <nav className="space-y-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "sidebar-item px-4 py-3 rounded-lg cursor-pointer block",
                  isActive && "active"
                )}
                data-testid={`nav-link-${item.name.toLowerCase()}`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={cn(
                    "w-5 h-5",
                    isActive ? "text-primary" : "text-text-secondary"
                  )} />
                  <span className={cn(
                    isActive ? "text-text-primary" : "text-text-secondary"
                  )}>
                    {item.name}
                  </span>
                </div>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
