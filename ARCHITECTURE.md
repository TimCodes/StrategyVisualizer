# System Architecture Overview

**AI-Powered Trading Platform**  
Stack: React + Vite · Express + Node.js · PostgreSQL + Drizzle ORM · Socket.IO WebSockets

---

## Table of Contents

1. [High-Level Architecture](#high-level-architecture)
2. [Frontend](#frontend)
3. [Backend](#backend)
4. [Exchange Integrations](#exchange-integrations)
5. [Database & Storage](#database--storage)
6. [External Services](#external-services)
7. [Data Flow Diagrams](#data-flow-diagrams)
   - [Strategy Save Flow](#strategy-save-flow)
   - [Backtest Flow](#backtest-flow)
   - [Market Data Flow](#market-data-flow)
   - [IBKR Order Flow](#ibkr-order-flow)
   - [AI Signal Detection Flow](#ai-signal-detection-flow)
8. [WebSocket Events Reference](#websocket-events-reference)
9. [File Structure](#file-structure)

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
                                 ┌────────────────────────────────────┼────────────────────────────┐
                                 │                                    │                            │
                       ┌─────────▼──────┐               ┌────────────▼──────────┐    ┌────────────▼──────┐
                       │  PostgreSQL DB  │               │  Market Data / Broker  │    │   AI Providers    │
                       │  Drizzle ORM   │               │  CoinGecko             │    │   OpenAI          │
                       │                │               │  Kraken                │    │   Anthropic       │
                       │  settings      │               │  Interactive Brokers   │    │   Google Gemini   │
                       │  lean_projects │               └────────────────────────┘    └───────────────────┘
                       │  lean_backtests│
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
| `pages/Settings.tsx` | `/settings` | Exchange selection, API config, and IBKR connection status |

### Key Components

| Component | Description |
|-----------|-------------|
| `components/strategy-editor/StrategyEditor.tsx` | Code editor with Save and Run Backtest actions |
| `components/strategy-editor/ProjectSelector.tsx` | Create, select, and delete LEAN projects |
| `components/backtesting/BacktestRunner.tsx` | Triggers and displays backtest results |
| `components/dashboard/MarketChart.tsx` | Price and performance charts (Recharts) |
| `components/chat/SignalCard.tsx` | Displays AI-generated trade signals |

### Exchange Selection (Settings Page)

The Settings page allows users to choose their active exchange. The selection is persisted to the database via `PUT /api/settings`. Supported values:

| Value | Label | Status |
|-------|-------|--------|
| `coingecko` | CoinGecko (Free API) | Live |
| `kraken` | Kraken | Live |
| `ibkr` | Interactive Brokers | Live |
| `binance` | Binance | Coming soon |
| `coinbase` | Coinbase Pro | Coming soon |
| `alpaca` | Alpaca | Coming soon |

When `ibkr` is selected, a live connection status badge appears showing whether `IBKR_ACCESS_TOKEN` and `IBKR_ACCOUNT_ID` are configured and the session is authenticated.

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
| `routes/markets.ts` | `/api/markets` | Market prices and OHLC data via CoinGecko |
| `routes/strategies.ts` | `/api/strategies` | Strategy CRUD operations |
| `routes/trades.ts` | `/api/trades` | Trade history management |
| `routes/backtests.ts` | `/api/backtests` | General backtest results |
| `routes/llm.ts` | `/api/chat` | AI chat, signal detection, model comparison |
| `routes/kraken.ts` | `/api/kraken` | Live Kraken exchange data and private account management |
| `routes/ibkr.ts` | `/api/ibkr` | Interactive Brokers market data, positions, and order management |
| `routes/settings.ts` | `/api/settings` | App config and risk limit settings |
| `routes/risk.ts` | `/api/risk` | Risk validation and limit enforcement |

### Services

| File | Description |
|------|-------------|
| `services/lean-agent.ts` | Generates and refines Python LEAN strategies using LLMs |
| `services/llm/index.ts` | Abstraction layer over OpenAI, Anthropic, and Gemini — supports streaming |
| `services/exchanges/kraken.ts` | Public (ticker, OHLC) and private (orders, balance) Kraken API calls |
| `services/exchanges/ibkr.ts` | Interactive Brokers Client Portal API — market data, positions, and order execution |
| `services/risk.ts` | Validates trades against user-configured risk limits |
| `services/signalParser.ts` | Extracts structured buy/sell/hold signals from LLM text responses |

### WebSocket Server

**File:** `packages/server/ws.ts`  
Uses **Socket.IO** with room-based subscriptions. Clients join rooms (`market`, `portfolio`, `trades`, `signals`, `risk`) to receive targeted updates.

---

## Exchange Integrations

### CoinGecko (default)

- **Type:** Public REST API, no credentials required
- **Data:** Asset prices, 24h change, volume, historical charts
- **Endpoints used:** `/coins/markets`, `/coins/{id}/market_chart`
- **Instruments:** Crypto (BTC, ETH, SOL, ADA, XRP, ...)

### Kraken

- **Type:** Public + authenticated REST API
- **Credentials:** `KRAKEN_API_KEY`, `KRAKEN_API_SECRET` (optional for public data)
- **Auth method:** HMAC-SHA512 signature on every private request
- **Data:** Tickers, OHLC, order book, account balance, order placement/cancellation
- **Symbol format:** Kraken-specific pairs (e.g. `XXBTZUSD`) mapped via `SYMBOL_MAP`
- **Instruments:** Crypto

### Interactive Brokers (IBKR)

- **Type:** OAuth2 Client Portal Web API
- **Credentials:** `IBKR_ACCESS_TOKEN`, `IBKR_ACCOUNT_ID` (both required)
- **Base URL:** `https://api.ibkr.com/v1/api` (configurable via `IBKR_BASE_URL`)
- **Auth method:** Bearer token in `Authorization` header
- **Symbol resolution:** Symbols resolved to IBKR Contract IDs (conids) via `searchContract()` with a pre-populated cache of 15 common equities
- **Instruments:** Stocks, ETFs, options, futures (AAPL, MSFT, NVDA, TSLA, SPY, QQQ, ...)

#### IBKR API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/ibkr/status` | No | Session authentication status |
| `GET` | `/api/ibkr/ticker?symbol=` | Yes | Live quote for a single symbol |
| `GET` | `/api/ibkr/markets` | Yes | Quotes for default 8 symbols |
| `GET` | `/api/ibkr/ohlc?symbol=&period=&bar=` | Yes | Historical OHLC candles |
| `GET` | `/api/ibkr/orderbook?symbol=` | Yes | Level 1 order book |
| `GET` | `/api/ibkr/balance` | Yes | Account net liquidation + cash |
| `GET` | `/api/ibkr/positions` | Yes | Open positions |
| `GET` | `/api/ibkr/orders` | Yes | Active orders |
| `POST` | `/api/ibkr/order` | Yes | Place market or limit order |
| `DELETE` | `/api/ibkr/order/:orderId` | Yes | Cancel an order |

#### IBKR Market Data Fields

IBKR snapshot API uses numeric field codes. The service requests:

| Field Code | Meaning |
|-----------|---------|
| `31` | Last trade price |
| `84` | Bid price |
| `86` | Ask price |
| `7295` | Open price (used to calculate daily change) |
| `70` | Day high |
| `71` | Day low |
| `7282` | Volume |
| `6508` | Company name |

#### Required Secrets

```
IBKR_ACCESS_TOKEN   — OAuth2 Bearer token from IBKR Client Portal API
IBKR_ACCOUNT_ID     — IBKR brokerage account number (e.g. U1234567)
IBKR_BASE_URL       — Optional override (default: https://api.ibkr.com/v1/api)
```

---

## Database & Storage

**File:** `packages/server/storage.ts`  
**ORM:** Drizzle ORM  
**Schema:** `packages/shared/schema.ts`

### PostgreSQL Tables

| Table | Key Columns | Description |
|-------|-------------|-------------|
| `settings` | `id`, `darkMode`, `exchange`, `riskLimit`, ... | App-wide configuration including active exchange selection |
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

| Service | Credentials | Instruments | Usage |
|---------|-------------|-------------|-------|
| **CoinGecko** | None (public) | Crypto | Prices, charts, market cap data |
| **Kraken** | `KRAKEN_API_KEY`, `KRAKEN_API_SECRET` | Crypto | Tickers, OHLC, order books, account + order management |
| **Interactive Brokers** | `IBKR_ACCESS_TOKEN`, `IBKR_ACCOUNT_ID` | Stocks, ETFs, Options, Futures | Market data, positions, order execution via Client Portal API |
| **OpenAI** | `OPENAI_API_KEY` | — | GPT-4o, GPT-5 for chat, strategy generation, signal detection |
| **Anthropic** | `ANTHROPIC_API_KEY` | — | Claude Sonnet 4.5, Opus 4.5, Haiku 4.5 for AI analysis |
| **Google** | `GOOGLE_API_KEY` | — | Gemini Pro for multi-model comparison in Arena |

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

### Market Data Flow

```
Markets.tsx — TanStack Query polls every 30s
            │
            │ GET request based on active exchange setting
            ▼
┌───────────────────────────────────────────────────────┐
│  Exchange routing (based on settings.exchange)        │
│                                                       │
│  "coingecko" → GET /api/markets                       │
│                └─ routes/markets.ts                   │
│                   └─ CoinGecko REST API               │
│                                                       │
│  "kraken"    → GET /api/kraken/markets                │
│                └─ routes/kraken.ts                    │
│                   └─ KrakenService.getMultipleTickers │
│                      └─ api.kraken.com               │
│                                                       │
│  "ibkr"      → GET /api/ibkr/markets                 │
│                └─ routes/ibkr.ts                     │
│                   └─ IBKRService.getMultipleTickers   │
│                      └─ searchContract() (conid)      │
│                      └─ /iserver/marketdata/snapshot  │
│                         api.ibkr.com                 │
└───────────────────────────────────────────────────────┘
            │
            │ normalized market data returned
            ▼
Socket.IO: market:tick broadcast → all clients in "market" room
            │
            ▼
SocketContext.tsx receives event → React state update → UI re-renders
```

### IBKR Order Flow

```
User submits order (symbol, action, orderType, quantity, price)
            │
            │ POST /api/ibkr/order
            ▼
routes/ibkr.ts — checks IBKR_ACCESS_TOKEN + IBKR_ACCOUNT_ID
            │
            │ validates required fields + action/orderType enums
            ▼
IBKRService.placeOrder()
            │
            │ IBKRService.searchContract(symbol) → conid
            │   (checks CONID_CACHE first, falls back to API search)
            ▼
POST /iserver/account/:accountId/orders
  { conid, secType, orderType, side, quantity, tif, price? }
            │
            │ IBKR Client Portal API response
            ▼
Order confirmation returned to client
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
│   │       │   ├── Settings.tsx    # Exchange config + IBKR connection status
│   │       │   └── ...
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
│   │   │   ├── ibkr.ts             # Interactive Brokers endpoints
│   │   │   ├── kraken.ts           # Kraken endpoints
│   │   │   ├── markets.ts          # CoinGecko market data
│   │   │   ├── lean.ts             # LEAN strategy IDE
│   │   │   ├── llm.ts              # AI chat + signal detection
│   │   │   ├── settings.ts         # App + risk settings
│   │   │   └── ...
│   │   ├── services/               # Business logic
│   │   │   ├── llm/                # Multi-provider LLM abstraction
│   │   │   ├── exchanges/
│   │   │   │   ├── kraken.ts       # KrakenService
│   │   │   │   └── ibkr.ts         # IBKRService (Client Portal API)
│   │   │   ├── lean-agent.ts       # AI strategy generation
│   │   │   ├── risk.ts             # Risk limit enforcement
│   │   │   └── signalParser.ts     # Trade signal extraction
│   │   ├── storage.ts              # IStorage interface + MemStorage
│   │   ├── db.ts                   # Drizzle + PostgreSQL connection
│   │   └── ws.ts                   # Socket.IO WebSocket server
│   │
│   └── shared/
│       └── schema.ts               # Drizzle tables + Zod schemas + TypeScript types
│                                   # exchangeSchema includes: coingecko, kraken, ibkr,
│                                   #   binance, coinbase, alpaca
│
├── drizzle.config.ts               # Drizzle ORM configuration
├── ARCHITECTURE.md                 # This file
└── package.json
```
