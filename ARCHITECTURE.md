# System Architecture Overview

**AI-Powered Crypto Trading Platform**  
Stack: React + Vite · Express + Node.js · PostgreSQL + Drizzle ORM · Socket.IO WebSockets

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Frontend](#frontend)
3. [Backend](#backend)
4. [Database & Storage](#database--storage)
5. [External Services](#external-services)
6. [Data Flow Diagrams](#data-flow-diagrams)
   - [Strategy Save Flow](#strategy-save-flow)
   - [Backtest Flow](#backtest-flow)
   - [Real-Time Market Data Flow](#real-time-market-data-flow)
   - [AI Signal Detection Flow](#ai-signal-detection-flow)
7. [WebSocket Events Reference](#websocket-events-reference)
8. [File Structure](#file-structure)

---

## High-Level Architecture

```
┌─────────────────────┐        HTTP REST + WebSocket        ┌─────────────────────┐
│                     │ ◄──────────────────────────────────► │                     │
│   FRONTEND          │                                      │   BACKEND           │
│   React + Vite      │                                      │   Express + Node.js │
│   Port 5173 (dev)   │                                      │   Port 5000         │
│                     │                                      │                     │
└─────────────────────┘                                      └────────┬────────────┘
                                                                      │
                                              ┌───────────────────────┼────────────────────┐
                                              │                       │                    │
                                    ┌─────────▼──────┐    ┌──────────▼──────┐   ┌─────────▼──────┐
                                    │  PostgreSQL DB  │    │  External APIs  │   │  AI Providers  │
                                    │  Drizzle ORM   │    │  CoinGecko      │   │  OpenAI        │
                                    │                │    │  Kraken         │   │  Anthropic     │
                                    └────────────────┘    └─────────────────┘   │  Google        │
                                                                                └────────────────┘
```

---

## Frontend

**Location:** `packages/client/src/`

### Pages

| File | Route | Description |
|------|-------|-------------|
| `pages/Overview.tsx` | `/` | Dashboard with performance charts and portfolio metrics |
| `pages/Editor.tsx` | `/editor` | LEAN Strategy IDE ("Praxis") — write, generate, and run strategies |
| `pages/Strategies.tsx` | `/strategies` | List and manage active/inactive strategies |
| `pages/Markets.tsx` | `/markets` | Real-time market data, order books, and OHLC charts |
| `pages/Chat.tsx` | `/chat` | AI assistant for market analysis and trade signals |
| `pages/Arena.tsx` | `/arena` | Side-by-side LLM model comparison |

### Key Components

| Component | Description |
|-----------|-------------|
| `components/strategy-editor/StrategyEditor.tsx` | Code editor with Save and Run Backtest actions |
| `components/strategy-editor/ProjectSelector.tsx` | Create, select, and delete LEAN projects |
| `components/backtesting/BacktestRunner.tsx` | Triggers and displays backtest results |
| `components/dashboard/MarketChart.tsx` | Price and performance charts (Recharts) |
| `components/chat/SignalCard.tsx` | Displays AI-generated trade signals |

### State & Infrastructure

- **Server state:** TanStack Query v5 — caching, polling, and invalidation
- **Client routing:** Wouter
- **Forms:** React Hook Form + Zod validation + shadcn `Form` component
- **Styling:** Tailwind CSS + shadcn/ui + Radix UI primitives
- **Real-time:** Socket.IO client via `contexts/SocketContext.tsx`
- **API calls:** `apiRequest` from `lib/queryClient.ts`

---

## Backend

**Location:** `packages/server/`

### API Routes

| File | Base Path | Responsibility |
|------|-----------|---------------|
| `routes/lean.ts` | `/api/lean` | LEAN project CRUD, code save, backtest execution, AI generation |
| `routes/markets.ts` | `/api/markets` | Market prices, OHLC data via CoinGecko |
| `routes/strategies.ts` | `/api/strategies` | Strategy CRUD operations |
| `routes/trades.ts` | `/api/trades` | Trade history management |
| `routes/backtests.ts` | `/api/backtests` | General backtest results |
| `routes/chat.ts` / `routes/llm.ts` | `/api/chat` | AI chat, signal detection, model comparison |
| `routes/kraken.ts` | `/api/kraken` | Live Kraken exchange data and private account management |
| `routes/settings.ts` | `/api/settings` | App config and risk limit settings |

### Services

| File | Description |
|------|-------------|
| `services/lean-agent.ts` | Generates and refines Python LEAN strategies using LLMs |
| `services/llm/index.ts` | Abstraction layer over OpenAI, Anthropic, and Gemini — supports streaming |
| `services/exchanges/kraken.ts` | Public (ticker, OHLC) and private (orders, balance) Kraken API calls |
| `services/risk.ts` | Validates trades against user-configured risk limits |
| `services/signalParser.ts` | Extracts structured buy/sell/hold signals from LLM text responses |

### WebSocket Server

**File:** `packages/server/ws.ts`  
Uses **Socket.IO** with room-based subscriptions. Clients join rooms (`market`, `portfolio`, `trades`, `signals`, `risk`) to receive targeted updates.

---

## Database & Storage

**File:** `packages/server/storage.ts`  
**ORM:** Drizzle ORM  
**Schema:** `packages/shared/schema.ts`

### PostgreSQL Tables

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `settings` | `id`, `darkMode`, `exchange`, `riskLimit`, ... | App-wide configuration and risk settings |
| `lean_projects` | `id`, `name`, `code`, `description`, `generatedBy`, `lastBacktestId`, `updatedAt` | LEAN strategy source code and metadata |
| `lean_backtests` | `id`, `projectId`, `status`, `totalReturn`, `sharpeRatio`, `equityCurve`, `rawResults` | Backtest results and equity curves |

### In-Memory Storage (MemStorage fallback)

The `MemStorage` class implements the full `IStorage` interface and falls back to in-memory Maps when the database is unavailable. The following entities are currently in-memory only:

- `strategies`
- `trades`
- `backtestResults`
- `marketData`
- `chatMessages`
- `portfolioMetrics`
- `performanceData`

### Storage Pattern

```
IStorage (interface)
    └── MemStorage (implementation)
            ├── DB methods: getDb() → Drizzle → PostgreSQL
            │   (settings, lean_projects, lean_backtests)
            └── In-memory Maps
                (strategies, trades, market data, chat, portfolio)
```

---

## External Services

| Service | Usage |
|---------|-------|
| **CoinGecko** | Primary source for asset prices, historical charts, and market cap data |
| **Kraken** | Real-time tickers, order books, and private account/order management |
| **OpenAI** | GPT-4o, GPT-5 for chat, strategy generation, and signal detection |
| **Anthropic** | Claude Sonnet 4.5, Opus 4.5, Haiku 4.5 for AI analysis |
| **Google** | Gemini Pro for multi-model comparison in Arena |

---

## Data Flow Diagrams

### Strategy Save Flow

```
User edits code in StrategyEditor.tsx
            │
            │ onClick: Save button
            ▼
apiRequest("PUT", /api/lean/projects/:name/code, { code })
            │
            │ Express route handler
            ▼
routes/lean.ts — validates request body with Zod
            │
            │ storage.updateLeanProjectCode(name, code)
            ▼
Drizzle ORM: UPDATE lean_projects SET code = $1, updated_at = NOW()
            │
            │ returns updated row
            ▼
Response JSON → client sets isDirty = false → Toast "Saved"
```

### Backtest Flow

```
User clicks "Run Backtest" in StrategyEditor
            │
            │ POST request
            ▼
POST /api/lean/projects/:name/backtest
            │
            │ auto-saves current code first
            ▼
storage.updateLeanProjectCode() → lean_projects updated in DB
storage.createLeanBacktest()   → lean_backtests row created
            │
            │ simulateLeanBacktest()
            ▼
Server runs simulation, calculates:
  totalReturn, sharpeRatio, maxDrawdown, winRate, equityCurve
            │
            │ Socket.IO WebSocket events (real-time)
            ▼
lean:backtest:log     → streams progress logs to client
lean:backtest:complete → sends final results to client
            │
            │ storage.updateLeanBacktest()
            ▼
lean_backtests row updated with final results in PostgreSQL
```

### Real-Time Market Data Flow

```
Markets.tsx — TanStack Query polls every 30s
            │
            │ GET /api/markets or /api/kraken/ticker
            ▼
routes/markets.ts or routes/kraken.ts
            │
            │ service call
            ▼
KrakenService.getTicker() or CoinGecko HTTP request
            │
            │ external API response
            ▼
CoinGecko or Kraken returns price / OHLC / order book JSON
            │
            │ server processes + emits
            ▼
Socket.IO: market:tick broadcast → all clients in "market" room
            │
            ▼
SocketContext.tsx receives event → React state update → UI re-renders
```

### AI Signal Detection Flow

```
User sends message in Chat.tsx
            │
            │ POST /api/chat
            ▼
routes/llm.ts — chatRequestSchema validates body
            │
            │ LLMService.complete() or LLMService.stream()
            ▼
OpenAI / Anthropic / Gemini API call
            │
            │ LLM text response
            ▼
signalParser.ts — extracts structured signal JSON
  { action: "buy"|"sell"|"hold", symbol, confidence, entryPrice, ... }
            │
            │ eventBus.emit("signal:detected")
            ▼
WebSocket: signal:detected broadcast → SignalCard.tsx rendered in UI
```

---

## WebSocket Events Reference

| Event | Direction | Room | Payload |
|-------|-----------|------|---------|
| `market:tick` | Server → Client | `market` | `{ symbol, price, change, changePercent }` |
| `portfolio:update` | Server → Client | `portfolio` | Updated portfolio metrics |
| `signal:detected` | Server → Client | `signals` | `TradeSignal` object |
| `lean:backtest:log` | Server → Client | — | Log string from simulation |
| `lean:backtest:complete` | Server → Client | — | Full `LeanBacktest` result object |

---

## File Structure

```
/
├── packages/
│   ├── client/                     # React + Vite frontend
│   │   └── src/
│   │       ├── pages/              # Route-level page components
│   │       ├── components/         # Feature components
│   │       │   ├── strategy-editor/
│   │       │   ├── backtesting/
│   │       │   ├── dashboard/
│   │       │   ├── chat/
│   │       │   └── ui/             # shadcn/ui primitives
│   │       ├── contexts/           # SocketContext, ThemeContext
│   │       ├── hooks/              # Custom React hooks
│   │       ├── lib/                # queryClient, apiRequest
│   │       └── services/           # tradingServices.ts
│   │
│   ├── server/                     # Express + Node.js backend
│   │   ├── index.ts                # Entry point
│   │   ├── routes.ts               # Route registration
│   │   ├── routes/                 # Feature route handlers
│   │   ├── services/               # Business logic
│   │   │   ├── llm/
│   │   │   ├── exchanges/
│   │   │   ├── lean-agent.ts
│   │   │   ├── risk.ts
│   │   │   └── signalParser.ts
│   │   ├── storage.ts              # IStorage interface + MemStorage
│   │   ├── db.ts                   # Drizzle + PostgreSQL connection
│   │   └── ws.ts                   # Socket.IO WebSocket server
│   │
│   └── shared/
│       └── schema.ts               # Drizzle tables + Zod schemas + TypeScript types
│
├── drizzle.config.ts               # Drizzle ORM configuration
├── ARCHITECTURE.md                 # This file
└── package.json
```
