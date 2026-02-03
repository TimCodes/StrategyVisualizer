# Implementation Plan: TradeWithAI Features for Praxis

**Document Version:** 1.0  
**Created:** February 3, 2026  
**Estimated Total Effort:** 6-10 development days

---

## Executive Summary

This implementation plan outlines the integration of TradeWithAI's advanced features into the Praxis trading analytics platform:

1. **Multi-LLM Integration** - Claude, Gemini, and GPT-5 support
2. **LLM Arena** - Side-by-side model comparison interface
3. **WebSocket Communication** - Real-time updates and streaming
4. **Trade Signal Parsing** - NLP extraction of trading signals
5. **Risk Management System** - Position limits, stop-loss, and risk validation

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Epic 1: Multi-LLM Integration](#epic-1-multi-llm-integration)
3. [Epic 2: WebSocket Real-Time Communication](#epic-2-websocket-real-time-communication)
4. [Epic 3: LLM Arena](#epic-3-llm-arena)
5. [Epic 4: Trade Signal Parsing](#epic-4-trade-signal-parsing)
6. [Epic 5: Risk Management System](#epic-5-risk-management-system)
7. [File Structure Changes](#file-structure-changes)
8. [Dependencies](#dependencies)
9. [Risk Considerations](#risk-considerations)
10. [Implementation Timeline](#implementation-timeline)

---

## Architecture Overview

### Current State
```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React + Vite)                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Chat.tsx → REST API → OpenAI Only                  │    │
│  │  No real-time updates (polling)                     │    │
│  │  No risk validation                                 │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/REST (Polling)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Express)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  routes/chat.ts → Direct OpenAI calls               │    │
│  │  No streaming, no abstraction                       │    │
│  │  No risk checks on trades                           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Target State
```
┌─────────────────────────────────────────────────────────────┐
│                    CLIENT (React + Vite)                    │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Enhanced Chat + Arena + Signal Cards               │    │
│  │  WebSocket hook for real-time updates               │    │
│  │  Risk alerts and validation feedback                │    │
│  │  Model selector (GPT-5 / Claude / Gemini)           │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
              WebSocket            HTTP/REST
              (Real-time)          (Initial Load)
                    │                   │
                    ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    SERVER (Express)                         │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  services/llm/ → Multi-provider abstraction         │    │
│  │  services/risk.ts → Risk validation engine          │    │
│  │  services/signalParser.ts → Trade signal extraction │    │
│  │  ws.ts → WebSocket server with event broadcasting   │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Epic 1: Multi-LLM Integration

**Business Value:** HIGH  
**Technical Complexity:** MEDIUM  
**Estimated Effort:** 1-2 days

### Overview
Create a provider-agnostic LLM service that supports OpenAI GPT-5, Anthropic Claude, and Google Gemini, allowing users to select their preferred AI model for trading insights.

### User Stories

#### Story 1.1: LLM Provider Abstraction Layer
**Story Points:** 5  
**Description:** As a developer, I need a unified interface to interact with multiple LLM providers so that adding new providers is straightforward.

**Acceptance Criteria:**
- [ ] Create `LLMProvider` interface with `complete()` and `stream()` methods
- [ ] Implement `OpenAIProvider` wrapping existing OpenAI integration
- [ ] Implement `AnthropicProvider` using Replit AI Integrations (no API key needed)
- [ ] Implement `GeminiProvider` for Google AI
- [ ] Create `LLMService` factory that returns appropriate provider based on model selection
- [ ] Add provider/model configuration to environment

**Technical Details:**
```typescript
// server/services/llm/types.ts
export interface LLMProvider {
  complete(messages: Message[], options: CompletionOptions): Promise<string>;
  stream(messages: Message[], options: CompletionOptions): AsyncIterable<string>;
}

export type LLMModel = 
  | 'gpt-5'
  | 'claude-sonnet-4-5'
  | 'claude-opus-4-5'
  | 'gemini-pro';

export interface CompletionOptions {
  model: LLMModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}
```

**Files to Create:**
- `server/services/llm/types.ts` - Type definitions
- `server/services/llm/openai.ts` - OpenAI provider
- `server/services/llm/anthropic.ts` - Anthropic provider
- `server/services/llm/gemini.ts` - Gemini provider
- `server/services/llm/index.ts` - Service factory

---

#### Story 1.2: Schema Extensions for Multi-LLM
**Story Points:** 2  
**Description:** As a developer, I need updated schemas to support multi-LLM chat requests and responses.

**Acceptance Criteria:**
- [ ] Add `LLMProvider` and `LLMModel` enums to shared schema
- [ ] Extend `chatMessageSchema` to include `provider` and `model` fields
- [ ] Create `chatRequestSchema` for typed API requests
- [ ] Add model preference to settings schema

**Schema Changes:**
```typescript
// shared/schema.ts additions
export const llmProviderSchema = z.enum(['openai', 'anthropic', 'gemini']);
export const llmModelSchema = z.enum([
  'gpt-5',
  'claude-sonnet-4-5', 
  'claude-opus-4-5',
  'gemini-pro'
]);

export const chatRequestSchema = z.object({
  message: z.string().min(1),
  provider: llmProviderSchema.optional().default('openai'),
  model: llmModelSchema.optional().default('gpt-5'),
  context: z.any().optional(),
  stream: z.boolean().optional().default(false),
});
```

---

#### Story 1.3: Refactor Chat Routes for Multi-LLM
**Story Points:** 5  
**Description:** As a user, I want to select which AI model responds to my questions so I can compare different providers.

**Acceptance Criteria:**
- [ ] Refactor `/api/chat` to accept `provider` and `model` parameters
- [ ] Add `/api/chat/stream` endpoint for streaming responses
- [ ] Update chat message storage to include provider/model used
- [ ] Add provider health check endpoint `/api/llm/status`
- [ ] Graceful fallback if selected provider is unavailable

**API Changes:**
```
POST /api/chat
Body: { message, provider?, model?, context?, stream? }
Response: { message, id, provider, model }

GET /api/chat/stream (SSE)
Query: { message, provider?, model?, context? }
Response: Server-Sent Events with tokens

GET /api/llm/status
Response: { openai: true, anthropic: true, gemini: false }
```

---

#### Story 1.4: Frontend Model Selector Component
**Story Points:** 3  
**Description:** As a user, I want a dropdown to select my preferred AI model in the chat interface.

**Acceptance Criteria:**
- [ ] Create `ModelSelector` component with provider/model options
- [ ] Show model capabilities/descriptions
- [ ] Persist selection in local storage
- [ ] Disable unavailable providers based on status check
- [ ] Update Chat page to use selected model

**Component:**
```typescript
// client/src/components/llm/ModelSelector.tsx
interface ModelSelectorProps {
  value: LLMModel;
  onChange: (model: LLMModel) => void;
  disabled?: boolean;
}
```

---

## Epic 2: WebSocket Real-Time Communication

**Business Value:** HIGH  
**Technical Complexity:** MEDIUM  
**Estimated Effort:** 1-2 days

### Overview
Implement WebSocket server for real-time updates including market data, portfolio changes, LLM streaming responses, and risk alerts.

### User Stories

#### Story 2.1: WebSocket Server Setup
**Story Points:** 5  
**Description:** As a developer, I need a WebSocket server to push real-time updates to connected clients.

**Acceptance Criteria:**
- [ ] Install and configure Socket.IO server
- [ ] Attach WebSocket server to existing HTTP server
- [ ] Implement connection/disconnection handlers
- [ ] Add heartbeat/ping-pong for connection health
- [ ] Create event emitter for internal pub/sub
- [ ] Implement room-based subscriptions

**Technical Details:**
```typescript
// server/ws.ts
import { Server as HTTPServer } from "http";
import { Server as SocketIOServer } from "socket.io";

export function initializeWebSocket(httpServer: HTTPServer) {
  const io = new SocketIOServer(httpServer, {
    cors: { origin: "*" },
    pingTimeout: 60000,
  });
  
  io.on("connection", (socket) => {
    socket.on("subscribe", (room) => socket.join(room));
    socket.on("unsubscribe", (room) => socket.leave(room));
  });
  
  return io;
}
```

**Event Types:**
| Event | Room | Payload |
|-------|------|---------|
| `market:tick` | `market` | `{ symbol, price, change }` |
| `portfolio:update` | `portfolio` | `{ metrics }` |
| `llm:token` | `chat:{sessionId}` | `{ token, done }` |
| `risk:alert` | `risk` | `{ type, message, severity }` |
| `trade:executed` | `trades` | `{ trade }` |

---

#### Story 2.2: Client WebSocket Hook
**Story Points:** 3  
**Description:** As a developer, I need a React hook to manage WebSocket connections and subscriptions.

**Acceptance Criteria:**
- [ ] Create `useSocket` hook with auto-reconnection
- [ ] Implement subscription management
- [ ] Handle connection state (connected/disconnected/reconnecting)
- [ ] Provide event listener registration/cleanup
- [ ] Create WebSocket context provider

**Hook Interface:**
```typescript
// client/src/hooks/useSocket.ts
interface UseSocketReturn {
  isConnected: boolean;
  subscribe: (room: string) => void;
  unsubscribe: (room: string) => void;
  on: <T>(event: string, callback: (data: T) => void) => void;
  off: (event: string) => void;
}

export function useSocket(): UseSocketReturn;
```

---

#### Story 2.3: LLM Response Streaming
**Story Points:** 5  
**Description:** As a user, I want to see AI responses appear word-by-word so I don't have to wait for the complete response.

**Acceptance Criteria:**
- [ ] Implement streaming in LLM providers
- [ ] Broadcast tokens via WebSocket during generation
- [ ] Update Chat UI to render streaming tokens
- [ ] Show typing indicator while streaming
- [ ] Handle stream interruption gracefully

**Streaming Flow:**
```
Client                    Server                    LLM Provider
   │                         │                            │
   ├──WS: startChat─────────►│                            │
   │                         ├──stream()─────────────────►│
   │                         │◄──token─────────────────────│
   │◄──WS: llm:token─────────│                            │
   │                         │◄──token─────────────────────│
   │◄──WS: llm:token─────────│                            │
   │                         │◄──done──────────────────────│
   │◄──WS: llm:token(done)───│                            │
```

---

#### Story 2.4: Real-Time Market Data Updates
**Story Points:** 3  
**Description:** As a user, I want market prices to update automatically without refreshing the page.

**Acceptance Criteria:**
- [ ] Create market data polling service on server
- [ ] Broadcast price updates via WebSocket
- [ ] Update Markets page to use WebSocket data
- [ ] Add visual indicator for price changes (green/red flash)
- [ ] Fallback to REST polling if WebSocket disconnects

---

## Epic 3: LLM Arena

**Business Value:** MEDIUM  
**Technical Complexity:** MEDIUM  
**Estimated Effort:** 1-2 days

### Overview
Create a side-by-side comparison interface where users can send the same prompt to multiple AI models and compare responses.

### User Stories

#### Story 3.1: Arena UI Component
**Story Points:** 5  
**Description:** As a user, I want to compare responses from different AI models side-by-side.

**Acceptance Criteria:**
- [ ] Create `Arena` page with split-pane layout
- [ ] Allow selection of 2-4 models to compare
- [ ] Single input box that sends to all selected models
- [ ] Show streaming responses simultaneously
- [ ] Display response time and token count per model
- [ ] Add voting/rating buttons for comparison

**Component Structure:**
```
┌────────────────────────────────────────────────────────────┐
│                     LLM Arena                              │
├──────────────┬──────────────┬──────────────┬──────────────┤
│  □ GPT-5     │ □ Claude     │ □ Gemini     │ □ Claude     │
│              │   Sonnet     │              │   Opus       │
├──────────────┴──────────────┴──────────────┴──────────────┤
│                                                            │
│  [Enter your prompt here...                            ]   │
│                                              [Compare]     │
├──────────────┬──────────────┬──────────────┬──────────────┤
│   GPT-5      │ Claude Sonnet│   Gemini     │ Claude Opus  │
│   Response   │   Response   │   Response   │   Response   │
│              │              │              │              │
│   (1.2s)     │   (0.9s)     │   (1.5s)     │   (2.1s)     │
│   [👍] [👎]  │   [👍] [👎]  │   [👍] [👎]  │   [👍] [👎]  │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

---

#### Story 3.2: Arena API Endpoint
**Story Points:** 3  
**Description:** As a developer, I need an API endpoint that queries multiple LLM providers in parallel.

**Acceptance Criteria:**
- [ ] Create `/api/arena/compare` endpoint
- [ ] Accept array of models to compare
- [ ] Execute queries in parallel
- [ ] Return aggregated results with timing
- [ ] Support streaming via WebSocket

**API:**
```
POST /api/arena/compare
Body: {
  message: string,
  models: LLMModel[],
  context?: object
}
Response: {
  results: [
    { model: 'gpt-5', response: string, duration: number },
    { model: 'claude-sonnet-4-5', response: string, duration: number }
  ]
}
```

---

#### Story 3.3: Comparison History & Analytics
**Story Points:** 3  
**Description:** As a user, I want to see statistics on which AI model performs best for my trading questions.

**Acceptance Criteria:**
- [ ] Store comparison results with user ratings
- [ ] Create `/api/arena/stats` endpoint
- [ ] Display win rate per model
- [ ] Show average response time per model
- [ ] Track comparison count per model

---

## Epic 4: Trade Signal Parsing

**Business Value:** HIGH  
**Technical Complexity:** MEDIUM  
**Estimated Effort:** 1 day

### Overview
Extract structured trading signals (buy/sell recommendations) from LLM responses, allowing users to quickly act on AI suggestions.

### User Stories

#### Story 4.1: Signal Parser Service
**Story Points:** 5  
**Description:** As a developer, I need to parse natural language LLM responses into structured trading signals.

**Acceptance Criteria:**
- [ ] Create signal parser utility with regex patterns
- [ ] Extract: action (buy/sell/hold), symbol, confidence, entry price, stop-loss, take-profit
- [ ] Support structured output via LLM function calling
- [ ] Return null if no actionable signal detected
- [ ] Add confidence scoring for parsed signals

**Signal Schema:**
```typescript
// shared/schema.ts
export const tradeSignalSchema = z.object({
  action: z.enum(['buy', 'sell', 'hold']),
  symbol: z.string(),
  confidence: z.number().min(0).max(100),
  entryPrice: z.number().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  reasoning: z.string().optional(),
  provider: llmProviderSchema,
  model: llmModelSchema,
  timestamp: z.date(),
});

export type TradeSignal = z.infer<typeof tradeSignalSchema>;
```

**Parser Patterns:**
```typescript
// server/services/signalParser.ts
const SIGNAL_PATTERNS = {
  buy: /\b(buy|long|bullish|accumulate)\b/i,
  sell: /\b(sell|short|bearish|exit)\b/i,
  hold: /\b(hold|wait|neutral)\b/i,
  symbol: /\b(BTC|ETH|SOL|ADA|XRP)\/USD\b/i,
  price: /\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
  confidence: /(\d{1,3})%?\s*(?:confidence|certain|likely)/i,
};
```

---

#### Story 4.2: Signal Cards UI Component
**Story Points:** 3  
**Description:** As a user, I want to see extracted trading signals displayed as actionable cards.

**Acceptance Criteria:**
- [ ] Create `TradeSignalCard` component
- [ ] Color-code by action (green=buy, red=sell, gray=hold)
- [ ] Display confidence meter
- [ ] Show entry/SL/TP levels visually
- [ ] Add "Execute Trade" button that pre-fills TradeForm
- [ ] Add dismiss/ignore button

**Component:**
```
┌─────────────────────────────────────────┐
│ 📈 BUY SIGNAL - BTC/USD                 │
│                                         │
│ Confidence: ████████░░ 82%              │
│                                         │
│ Entry:       $43,250                    │
│ Stop Loss:   $41,800 (-3.4%)            │
│ Take Profit: $46,500 (+7.5%)            │
│                                         │
│ "Strong momentum with RSI breakout..."  │
│                                         │
│ [Execute Trade]  [Dismiss]              │
│                                         │
│ via Claude Sonnet • 2 min ago           │
└─────────────────────────────────────────┘
```

---

#### Story 4.3: Signal Integration with Chat
**Story Points:** 2  
**Description:** As a user, I want signals automatically extracted from AI responses and displayed inline.

**Acceptance Criteria:**
- [ ] Parse all LLM responses for signals
- [ ] Display signal card below relevant message
- [ ] Store signals in memory with message reference
- [ ] Broadcast new signals via WebSocket
- [ ] Add signals list view/page

---

## Epic 5: Risk Management System

**Business Value:** CRITICAL  
**Technical Complexity:** HIGH  
**Estimated Effort:** 2-3 days

### Overview
Implement comprehensive risk management including position limits, stop-loss automation, max drawdown monitoring, and pre-trade validation.

### User Stories

#### Story 5.1: Risk Settings Schema
**Story Points:** 2  
**Description:** As a user, I need configurable risk parameters for my trading.

**Acceptance Criteria:**
- [ ] Extend settings schema with risk parameters
- [ ] Add UI controls in Settings page
- [ ] Persist risk settings to storage
- [ ] Add sensible defaults

**Schema Extensions:**
```typescript
// shared/schema.ts - extend settingsSchema
export const riskSettingsSchema = z.object({
  maxPositionSize: z.number().default(10000),
  maxPositionsPerSymbol: z.number().default(3),
  maxTotalPositions: z.number().default(10),
  maxPortfolioRisk: z.number().default(5), // % of portfolio
  defaultStopLoss: z.number().default(5), // %
  defaultTakeProfit: z.number().default(15), // %
  maxDrawdown: z.number().default(20), // % - halt trading
  dailyLossLimit: z.number().default(2), // % of portfolio
  riskPerTrade: z.number().default(1), // % of portfolio
  enforceRiskLimits: z.boolean().default(true),
});
```

---

#### Story 5.2: Risk Validation Service
**Story Points:** 8  
**Description:** As a system, I need to validate all trades against risk rules before execution.

**Acceptance Criteria:**
- [ ] Create `RiskService` with validation methods
- [ ] Validate position size limits
- [ ] Check portfolio exposure
- [ ] Calculate position sizing based on risk %
- [ ] Check max positions per symbol
- [ ] Validate against daily loss limit
- [ ] Return detailed validation result with reasons

**Service Interface:**
```typescript
// server/services/risk.ts
interface RiskValidationResult {
  approved: boolean;
  warnings: string[];
  errors: string[];
  suggestedSize?: number;
  riskAmount?: number;
  riskPercent?: number;
}

export class RiskService {
  validateTrade(trade: InsertTrade, settings: RiskSettings): RiskValidationResult;
  calculatePositionSize(
    symbol: string,
    entryPrice: number,
    stopLoss: number,
    settings: RiskSettings,
    portfolioValue: number
  ): number;
  checkDrawdown(portfolioMetrics: PortfolioMetrics, settings: RiskSettings): boolean;
  getDailyPnL(): number;
}
```

---

#### Story 5.3: Trade Route Risk Integration
**Story Points:** 3  
**Description:** As a user, I want trades to be validated against my risk settings before being logged.

**Acceptance Criteria:**
- [ ] Integrate risk validation in POST `/api/trades`
- [ ] Return validation errors with 400 status
- [ ] Include risk metrics in response
- [ ] Allow override with explicit flag (for backtesting)
- [ ] Log risk violations for audit

**API Changes:**
```
POST /api/trades
Body: { ...trade, bypassRiskCheck?: boolean }
Response (success): { trade, riskValidation: { approved: true, warnings: [] } }
Response (blocked): { 
  error: "Trade blocked by risk management",
  riskValidation: { 
    approved: false, 
    errors: ["Position size $15,000 exceeds limit of $10,000"]
  }
}
```

---

#### Story 5.4: Drawdown Monitoring & Alerts
**Story Points:** 5  
**Description:** As a user, I want to be alerted when my portfolio drawdown approaches dangerous levels.

**Acceptance Criteria:**
- [ ] Calculate real-time drawdown from peak
- [ ] Broadcast alerts via WebSocket at thresholds (50%, 75%, 100% of max)
- [ ] Show drawdown alert banner in UI
- [ ] Auto-disable trading when max drawdown reached
- [ ] Add drawdown chart to dashboard

**Alert Levels:**
| Drawdown % of Max | Severity | Action |
|-------------------|----------|--------|
| 50% | Warning | Yellow toast notification |
| 75% | Danger | Red persistent banner |
| 100% | Critical | Block new trades, email alert |

---

#### Story 5.5: Risk Dashboard Widget
**Story Points:** 3  
**Description:** As a user, I want to see my current risk exposure at a glance.

**Acceptance Criteria:**
- [ ] Create `RiskWidget` dashboard component
- [ ] Show current drawdown gauge
- [ ] Display daily P&L vs limit
- [ ] Show position count vs max
- [ ] Show largest position exposure
- [ ] Color code based on risk level

**Widget Layout:**
```
┌─────────────────────────────────────────┐
│              Risk Monitor               │
├─────────────────────────────────────────┤
│ Drawdown     ████████░░░░ 12% / 20%     │
│ Daily P&L    ████░░░░░░░░ -0.8% / -2%   │
│ Positions    ████████████ 8 / 10        │
│ Largest Pos  BTC/USD $8,500 (17%)       │
│                                         │
│ Status: ✅ All systems normal           │
└─────────────────────────────────────────┘
```

---

#### Story 5.6: Auto Stop-Loss Generation
**Story Points:** 3  
**Description:** As a user, I want stop-loss orders automatically calculated for my trades when enabled.

**Acceptance Criteria:**
- [ ] Calculate stop-loss based on settings when trade is created
- [ ] Store stop-loss level with trade
- [ ] Create alert when price approaches stop-loss
- [ ] Log synthetic "stop triggered" trade when hit
- [ ] Show stop-loss levels in trade history

---

## File Structure Changes

### New Files to Create

```
server/
├── services/
│   ├── llm/
│   │   ├── index.ts           # LLM service factory
│   │   ├── types.ts           # Type definitions
│   │   ├── openai.ts          # OpenAI provider
│   │   ├── anthropic.ts       # Anthropic provider
│   │   └── gemini.ts          # Gemini provider
│   ├── risk.ts                # Risk management service
│   ├── signalParser.ts        # Trade signal extraction
│   └── eventBus.ts            # Internal event emitter
├── routes/
│   ├── llm.ts                 # LLM status & config routes
│   └── arena.ts               # Arena comparison routes
└── ws.ts                      # WebSocket server setup

client/src/
├── hooks/
│   ├── useSocket.ts           # WebSocket connection hook
│   └── useRisk.ts             # Risk state hook
├── components/
│   ├── llm/
│   │   ├── ModelSelector.tsx  # Model dropdown
│   │   ├── Arena.tsx          # Arena comparison view
│   │   └── SignalCard.tsx     # Trade signal display
│   └── risk/
│       ├── RiskWidget.tsx     # Dashboard widget
│       └── RiskAlert.tsx      # Alert banner
├── pages/
│   └── Arena.tsx              # Arena page
└── contexts/
    └── SocketContext.tsx      # WebSocket context provider

shared/
└── schema.ts                  # Extended with new types
```

### Files to Modify

| File | Changes |
|------|---------|
| `server/routes.ts` | Register new routes (llm, arena), initialize WebSocket |
| `server/routes/chat.ts` | Refactor to use LLM service, add streaming |
| `server/routes/trades.ts` | Add risk validation integration |
| `server/storage.ts` | Add signal storage methods |
| `shared/schema.ts` | Add LLM, signal, and risk schemas |
| `client/src/App.tsx` | Add Arena route, wrap with SocketProvider |
| `client/src/pages/Chat.tsx` | Add model selector, streaming, signals |
| `client/src/pages/Settings.tsx` | Add risk settings section |
| `client/src/pages/Overview.tsx` | Add RiskWidget |
| `client/src/components/layout/Sidebar.tsx` | Add Arena nav item |

---

## Dependencies

### Server Dependencies

```json
{
  "dependencies": {
    "socket.io": "^4.7.0",
    "@anthropic-ai/sdk": "^0.25.0",
    "@google/generative-ai": "^0.12.0"
  }
}
```

**Note:** Anthropic can use Replit AI Integrations (no API key required, billed to credits).

### Client Dependencies

```json
{
  "dependencies": {
    "socket.io-client": "^4.7.0"
  }
}
```

---

## Risk Considerations

### Technical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| WebSocket disconnection | Medium | Medium | Implement reconnection logic with exponential backoff; fallback to REST polling |
| LLM provider outage | Low | High | Graceful fallback to available providers; cache recent responses |
| Signal parsing false positives | Medium | High | Require user confirmation before trade execution; add confidence threshold |
| Risk engine blocks valid trades | Medium | Medium | Clear error messages; allow override with confirmation |
| Streaming backpressure | Low | Low | Implement buffering; throttle high-frequency updates |

### Security Considerations

| Concern | Mitigation |
|---------|------------|
| API key exposure | Use Replit Integrations; never log/expose keys |
| WebSocket authentication | Validate session on connection; reject unauthorized |
| Risk bypass abuse | Log all bypasses; rate limit override attempts |
| Prompt injection | Sanitize user input; use system prompts defensively |

---

## Implementation Timeline

### Phase 1: Foundation (Days 1-2)
- [ ] Story 1.1: LLM Provider Abstraction Layer
- [ ] Story 1.2: Schema Extensions for Multi-LLM
- [ ] Story 2.1: WebSocket Server Setup
- [ ] Story 2.2: Client WebSocket Hook

### Phase 2: Core Features (Days 3-5)
- [ ] Story 1.3: Refactor Chat Routes for Multi-LLM
- [ ] Story 1.4: Frontend Model Selector Component
- [ ] Story 2.3: LLM Response Streaming
- [ ] Story 4.1: Signal Parser Service
- [ ] Story 4.2: Signal Cards UI Component

### Phase 3: Risk Management (Days 6-8)
- [ ] Story 5.1: Risk Settings Schema
- [ ] Story 5.2: Risk Validation Service
- [ ] Story 5.3: Trade Route Risk Integration
- [ ] Story 5.4: Drawdown Monitoring & Alerts
- [ ] Story 5.5: Risk Dashboard Widget

### Phase 4: Polish (Days 9-10)
- [ ] Story 3.1: Arena UI Component
- [ ] Story 3.2: Arena API Endpoint
- [ ] Story 2.4: Real-Time Market Data Updates
- [ ] Story 4.3: Signal Integration with Chat
- [ ] Story 5.6: Auto Stop-Loss Generation
- [ ] Testing & bug fixes

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Multi-LLM support | 3+ providers working |
| WebSocket latency | < 100ms for token streaming |
| Signal parsing accuracy | > 80% for structured outputs |
| Risk validation coverage | 100% of trades validated |
| Arena response time | < 5s for all models |

---

## Next Steps

1. **Review and approve** this implementation plan
2. **Install dependencies** (Socket.IO, LLM SDKs)
3. **Set up integrations** for Anthropic via Replit
4. **Begin Phase 1** with LLM abstraction and WebSocket foundation
5. **Iterate** based on testing feedback

---

*Document prepared for Praxis Trading Analytics Platform*
