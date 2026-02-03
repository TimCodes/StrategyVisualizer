import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, TrendingUp, BarChart3, Activity, Trash2, Wifi, WifiOff } from "lucide-react";
import { TradingService } from "@/services/tradingServices";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useSocket, useSignalDetection } from "@/hooks/useSocket";
import { ModelSelector, type LLMModel } from "@/components/llm/ModelSelector";
import { SignalCard, SignalList, type TradeSignal } from "@/components/llm/SignalCard";
import type { ChatMessage as ChatMessageType } from "@shared/schema";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  context?: any;
  provider?: string;
  model?: string;
}

const defaultWelcome: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content: "Hello! I'm your AI trading assistant powered by multiple AI models. I have access to your portfolio, strategies, and market data. Select a model above and ask me anything!",
  timestamp: new Date(),
};

export default function Chat() {
  const { toast } = useToast();
  const { isConnected } = useSocket();
  const [messages, setMessages] = useState<ChatMessage[]>([defaultWelcome]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<LLMModel>("gpt-5");
  const [signals, setSignals] = useState<TradeSignal[]>([]);
  const [streamingContent, setStreamingContent] = useState("");
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
        provider: m.provider,
        model: m.model,
      }));
      setMessages([defaultWelcome, ...parsed]);
    }
  }, [chatHistory]);

  useSignalDetection((signal) => {
    setSignals((prev) => [signal, ...prev].slice(0, 5));
    toast({
      title: `${signal.action.toUpperCase()} Signal Detected`,
      description: `${signal.symbol} - ${signal.confidence}% confidence`,
    });
  });

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

  const { data: llmStatus } = useQuery<Record<string, boolean>>({
    queryKey: ["/api/llm/status"],
    refetchInterval: 30000,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

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
    setStreamingContent("");

    try {
      const context = getContextSummary();
      const provider = selectedModel.startsWith("gpt") 
        ? "openai" 
        : selectedModel.startsWith("claude") 
          ? "anthropic" 
          : "gemini";
      
      const response = await apiRequest("POST", "/api/chat", {
        message: inputMessage,
        provider,
        model: selectedModel,
        context,
        stream: false,
      });
      
      const data = await response.json();

      const aiResponse: ChatMessage = {
        id: data.id || (Date.now() + 1).toString(),
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
        context,
        provider: data.provider,
        model: data.model,
      };

      setMessages(prev => [...prev, aiResponse]);

      if (data.signal) {
        setSignals(prev => [data.signal, ...prev].slice(0, 5));
      }

      queryClient.invalidateQueries({ queryKey: ["/api/chat/messages"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to get AI response. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setStreamingContent("");
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
      setSignals([]);
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

  const handleExecuteSignal = (signal: TradeSignal) => {
    toast({
      title: "Trade Execution",
      description: `Opening trade form for ${signal.action} ${signal.symbol}`,
    });
  };

  const handleDismissSignal = (signalId: string) => {
    setSignals(prev => prev.filter(s => s.id !== signalId));
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getProviderBadge = (provider?: string, model?: string) => {
    if (!provider) return null;
    const colors: Record<string, string> = {
      openai: "bg-green-500/10 text-green-500",
      anthropic: "bg-orange-500/10 text-orange-500",
      gemini: "bg-blue-500/10 text-blue-500",
    };
    return (
      <Badge variant="outline" className={`text-xs ${colors[provider] || ""}`}>
        {model || provider}
      </Badge>
    );
  };

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="AI Trading Assistant"
        subtitle="Multi-model AI powered by your real trading data"
      />

      <main className="flex-1 flex flex-col p-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-6">
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
                <div className={`w-10 h-10 ${isConnected ? 'bg-success/20' : 'bg-destructive/20'} rounded-full flex items-center justify-center`}>
                  {isConnected ? (
                    <Wifi className="text-success w-5 h-5" />
                  ) : (
                    <WifiOff className="text-destructive w-5 h-5" />
                  )}
                </div>
                <div>
                  <p className="text-text-secondary text-xs">Connection</p>
                  <Badge className={isConnected ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}>
                    {isConnected ? "Live" : "Offline"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
          <Card className="lg:col-span-2 bg-surface border-border flex flex-col">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between gap-4">
                <CardTitle className="text-text-primary flex items-center space-x-2">
                  <Bot className="w-5 h-5 text-primary" />
                  <span>Trading Assistant</span>
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="w-48">
                    <ModelSelector
                      value={selectedModel}
                      onChange={setSelectedModel}
                      disabled={isLoading}
                      showDescription={false}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearHistory}
                    className="text-text-secondary hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-0 min-h-0">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
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
                          <div className="flex items-center gap-2 mt-2">
                            <p className={`text-xs ${message.role === "user" ? "text-white/70" : "text-text-secondary"}`}>
                              {formatTime(message.timestamp)}
                            </p>
                            {message.role === "assistant" && getProviderBadge(message.provider, message.model)}
                          </div>
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
                        <div>
                          {streamingContent ? (
                            <p className="text-sm text-text-primary whitespace-pre-wrap">
                              {streamingContent}
                              <span className="animate-pulse">▊</span>
                            </p>
                          ) : (
                            <div className="flex space-x-1">
                              <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce"></div>
                              <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                              <div className="w-2 h-2 bg-text-secondary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={messagesEndRef} />
              </div>

              <div className="border-t border-border p-4">
                <div className="flex space-x-4">
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your portfolio, strategies, or market insights..."
                    className="flex-1 bg-background border-border text-text-primary"
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isLoading}
                    className="bg-primary hover:bg-primary/90 text-white"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-text-secondary text-xs mt-2">
                  Using {selectedModel} • Press Enter to send
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="bg-surface border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Trade Signals</CardTitle>
              </CardHeader>
              <CardContent>
                {signals.length > 0 ? (
                  <SignalList
                    signals={signals}
                    onExecute={handleExecuteSignal}
                    onDismiss={handleDismissSignal}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No active signals. Ask the AI for trading recommendations.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="bg-surface border-border">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Model Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {llmStatus ? (
                  Object.entries(llmStatus).map(([provider, available]) => (
                    <div key={provider} className="flex items-center justify-between">
                      <span className="capitalize">{provider}</span>
                      <Badge variant={available ? "default" : "secondary"}>
                        {available ? "Available" : "Unavailable"}
                      </Badge>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">Loading...</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
