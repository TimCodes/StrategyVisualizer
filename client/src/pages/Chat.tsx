import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, TrendingUp, BarChart3, Activity, Trash2 } from "lucide-react";
import { TradingService } from "@/services/tradingServices";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ChatMessage as ChatMessageType } from "@shared/schema";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  context?: any;
}

const defaultWelcome: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hello! I'm your AI trading assistant. I have access to your current portfolio, strategies, and market data. Ask me anything about your trading performance, market analysis, or strategy optimization!",
  timestamp: new Date(),
};

export default function Chat() {
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([defaultWelcome]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: chatHistory } = useQuery<ChatMessageType[]>({
    queryKey: ["/api/chat/messages"],
  });

  useEffect(() => {
    if (chatHistory && chatHistory.length > 0) {
      const parsed = chatHistory.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
        timestamp: new Date(m.timestamp),
        context: m.context,
      }));
      setMessages([defaultWelcome, ...parsed]);
    }
  }, [chatHistory]);

  // Fetch current application state for AI context
  const { data: portfolioMetrics } = useQuery({
    queryKey: ["portfolio-metrics"],
    queryFn: TradingService.getPortfolioMetrics,
  });

  const { data: strategies } = useQuery({
    queryKey: ["strategies"],
    queryFn: TradingService.getStrategies,
  });

  const { data: trades } = useQuery({
    queryKey: ["trades"],
    queryFn: TradingService.getTrades,
  });

  const { data: marketData } = useQuery({
    queryKey: ["market-data"],
    queryFn: TradingService.getMarketData,
  });

  const { data: backtestResults } = useQuery({
    queryKey: ["backtest-results"],
    queryFn: TradingService.getBacktestResults,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const getContextSummary = () => {
    return {
      portfolio: portfolioMetrics || null,
      activeStrategies: strategies?.filter(s => s.status === 'active').length || 0,
      totalStrategies: strategies?.length || 0,
      recentTrades: trades?.slice(0, 5) || [],
      marketSummary: marketData?.map(m => ({
        symbol: m.symbol,
        price: m.price,
        change: m.changePercent
      })) || [],
      backtestCount: backtestResults?.length || 0,
      bestStrategy: strategies?.reduce((best, current) => 
        current.performance > (best?.performance || 0) ? current : best
      ) || null,
    };
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      const context = getContextSummary();
      
      const response = await apiRequest("POST", "/api/chat", {
        message: inputMessage,
        context,
      });
      
      const data = await response.json();

      const aiResponse: ChatMessage = {
        id: data.id || (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        context,
      };

      setMessages(prev => [...prev, aiResponse]);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleClearHistory = async () => {
    try {
      await apiRequest("DELETE", "/api/chat/messages");
      setMessages([defaultWelcome]);
      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
      toast({
        title: "Chat cleared",
        description: "Your chat history has been cleared.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear chat history.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="AI Trading Assistant"
        subtitle="Get insights and analysis powered by your real trading data"
      />

      <main className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
          {/* Context Cards */}
          <Card className="bg-surface border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <TrendingUp className="text-primary w-5 h-5" />
                </div>
                <div>
                  <p className="text-text-secondary text-xs">Portfolio Return</p>
                  <p className="text-text-primary font-semibold">
                    {portfolioMetrics ? `+${portfolioMetrics.totalReturnPercent.toFixed(2)}%` : 'Loading...'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-success/20 rounded-full flex items-center justify-center">
                  <BarChart3 className="text-success w-5 h-5" />
                </div>
                <div>
                  <p className="text-text-secondary text-xs">Active Strategies</p>
                  <p className="text-text-primary font-semibold">
                    {strategies?.filter(s => s.status === 'active').length || 0}/{strategies?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-warning/20 rounded-full flex items-center justify-center">
                  <Activity className="text-warning w-5 h-5" />
                </div>
                <div>
                  <p className="text-text-secondary text-xs">Recent Trades</p>
                  <p className="text-text-primary font-semibold">
                    {trades?.length || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-surface border-border">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center">
                  <Bot className="text-primary w-5 h-5" />
                </div>
                <div>
                  <p className="text-text-secondary text-xs">AI Status</p>
                  <Badge className="bg-success/20 text-success">
                    Online
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chat Interface */}
        <Card className="flex-1 bg-surface border-border flex flex-col">
          <CardHeader className="border-b border-border flex flex-row items-center justify-between">
            <CardTitle className="text-text-primary flex items-center space-x-2">
              <Bot className="w-5 h-5 text-primary" />
              <span>Trading Assistant</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearHistory}
              className="text-text-secondary hover:text-destructive"
              data-testid="button-clear-chat"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  data-testid={`message-${message.role}-${message.id}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg p-4 ${
                      message.role === "user"
                        ? "bg-primary text-white"
                        : "bg-background border border-border"
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === "user" ? "bg-white/20" : "bg-primary/20"
                      }`}>
                        {message.role === "user" ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4 text-primary" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm ${message.role === "user" ? "text-white" : "text-text-primary"} whitespace-pre-wrap`}>
                          {message.content}
                        </p>
                        <p className={`text-xs mt-2 ${message.role === "user" ? "text-white/70" : "text-text-secondary"}`}>
                          {formatTime(message.timestamp)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[80%] rounded-lg p-4 bg-background border border-border">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center bg-primary/20">
                        <Bot className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="border-t border-border p-4">
              <div className="flex space-x-4">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about your portfolio, strategies, or market insights..."
                  className="flex-1 bg-background border-border text-text-primary"
                  disabled={isLoading}
                  data-testid="input-chat-message"
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  className="bg-primary hover:bg-primary/90 text-white"
                  data-testid="button-send-message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-text-secondary text-xs mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}