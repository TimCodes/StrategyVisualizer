# Praxis — Application Analysis

**Last Updated:** March 2026

---

## Summary

**Praxis** is a full-stack algorithmic trading dashboard built for strategy management, portfolio tracking, backtesting, and AI-assisted trading decisions. It integrates live cryptocurrency market data, multiple large language models (OpenAI, Anthropic, Google Gemini), and a real-time WebSocket layer into a single unified platform.

The application is structured as a **monorepo** using NPM Workspaces, with three independently scoped packages (`@app/client`, `@app/server`, `@app/shared`) living under a single `packages/` directory. The UI is a dark-themed React dashboard with a persistent sidebar for navigation across eight pages.

---

## Architecture Design

### Monorepo Layout

```
/
├── packages/
│   ├── client/          (@app/client)
│   │   ├── package.json
│   │   ├── index.html
│   │   └── src/
│   │       ├── App.tsx              — Router & providers
│   │       ├── pages/               — 8 full-page views
│   │       ├── components/          — Feature UI components
│   │       ├── contexts/            — SocketContext (WebSocket)
│   │       ├── hooks/               — useSocket, custom hooks
│   │       ├── services/            — API + mock data helpers
│   │       └── lib/                 — queryClient, utils
│   │
│   ├── server/          (@app/server)
│   │   ├── package.json
│   │   ├── index.ts                 — Express entry point
│   │   ├── routes.ts                — Route registration hub
│   │   ├── storage.ts               — In-memory data layer
│   │   ├── db.ts                    — PostgreSQL connection (Neon)
│   │   ├── ws.ts                    — Socket.IO WebSocket server
│   │   ├── vite.ts                  — Vite dev server integration
│   │   ├── routes/
│   │   │   ├── strategies.ts
│   │   │   ├── trades.ts
│   │   │   ├── backtests.ts
│   │   │   ├── portfolio.ts
│   │   │   ├── markets.ts
│   │   │   ├── llm.ts
│   │   │   ├── risk.ts
│   │   │   ├── settings.ts
│   │   │   └── kraken.ts
│   │   └── services/
│   │       ├── llm/
│   │       │   ├── openai.ts
│   │       │   ├── anthropic.ts
│   │       │   ├── gemini.ts
│   │       │   ├── index.ts
│   │       │   └── types.ts
│   │       ├── exchanges/
│   │       │   └── kraken.ts
│   │       ├── risk.ts
│   │       └── signalParser.ts
│   │
│   └── shared/          (@app/shared)
│       ├── package.json
│       └── schema.ts                — All Zod schemas + Drizzle types
│
├── package.json          — Root: workspaces config, shared deps
├── vite.config.ts        — Points root to packages/client
├── tsconfig.json         — Path aliases: @/* and @shared/*
├── drizzle.config.ts     — Schema at packages/shared/schema.ts
└── tailwind.config.ts    — Content from packages/client
```

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                  BROWSER (@app/client)                  │
│                                                         │
│  React 18 + Wouter + TanStack Query + shadcn/ui         │
│  ┌────────────────────────────────────────────────┐     │
│  │  Pages: Overview / Strategies / Backtesting /  │     │
│  │         Portfolio / Markets / Chat / Arena /   │     │
│  │         Settings                               │     │
│  └────────────────────────────────────────────────┘     │
│         │ REST (fetch)              │ Socket.IO          │
└─────────┼───────────────────────────┼────────────────────┘
          │                           │
          ▼                           ▼
┌─────────────────────────────────────────────────────────┐
│               EXPRESS SERVER (@app/server)              │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │  REST API    │  │  WebSocket   │  │  Vite Dev    │  │
│  │  /api/*      │  │  Socket.IO   │  │  Middleware  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│          │                  │                           │
│  ┌───────▼──────────────────▼───────────────────────┐  │
│  │              Route Handlers (9 modules)           │  │
│  │  strategies · trades · backtests · portfolio      │  │
│  │  markets · llm · risk · settings · kraken         │  │
│  └──────────────────────────┬────────────────────────┘  │
│                             │                           │
│  ┌──────────────────────────▼────────────────────────┐  │
│  │              Services Layer                       │  │
│  │  ┌──────────────────┐  ┌─────────────────────┐   │  │
│  │  │   LLM Providers  │  │  Exchange APIs      │   │  │
│  │  │  OpenAI          │  │  Kraken REST        │   │  │
│  │  │  Anthropic       │  │  CoinGecko (market) │   │  │
│  │  │  Gemini          │  └─────────────────────┘   │  │
│  │  └──────────────────┘                             │  │
│  │  ┌──────────────────┐  ┌─────────────────────┐   │  │
│  │  │   Risk Engine    │  │   Signal Parser     │   │  │
│  │  │  Position limits │  │  NLP → trade signal │   │  │
│  │  │  Drawdown checks │  └─────────────────────┘   │  │
│  │  └──────────────────┘                             │  │
│  └───────────────────────────────────────────────────┘  │
│                             │                           │
│  ┌──────────────────────────▼────────────────────────┐  │
│  │              Data Layer                           │  │
│  │  MemStorage (in-memory) ◄──► PostgreSQL (Neon)   │  │
│  │  (strategies, trades,          (settings only)   │  │
│  │   backtests, portfolio,                          │  │
│  │   market data, chat)                             │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action
    │
    ├─► REST API call → Route Handler → Storage / External API → JSON response
    │
    └─► WebSocket event → Socket.IO → Broadcast to all clients
              (trade signals, risk alerts, real-time updates)
```

---

## Feature Breakdown

### 1. Overview Dashboard
The landing page giving a full snapshot of the portfolio at a glance.

- **Key Metrics Grid** — Total portfolio value, total return %, Sharpe ratio, win rate
- **Performance Chart** — Portfolio vs benchmark over time (Recharts line chart)
- **Strategy List** — Compact view of all active strategies with performance indicators
- **Market Chart** — Live price chart for the selected market
- **Trade History** — Recent trades table with P&L per trade
- **Backtest Results** — Latest backtest summaries at a glance

---

### 2. Strategy Management
Full CRUD for trading strategies, each with rich performance metadata.

- Create, edit, and delete strategies
- Supported types: **Momentum**, **Mean Reversion**, **Trend Following**, **Arbitrage**
- Status tracking: Active, Inactive, Paused
- Tracks: Performance %, Sharpe Ratio, Max Drawdown, Win Rate, Total Trades
- View strategies in a card or table layout

---

### 3. Backtesting Engine
Run historical simulations to test strategies before deploying capital.

- Configure date range, initial capital, and symbol
- Runs a Monte Carlo-style simulation on the server
- Outputs: Total Return, Sharpe Ratio, Max Drawdown, Win Rate, Trade Count
- **Side-by-side comparison** of multiple backtest results
- Per-result detail view with full performance breakdown

---

### 4. Portfolio Management
Track live positions and analyse overall portfolio health.

- Log buy/sell trades with quantity, price, and strategy link
- Automatic **P&L calculation** (FIFO cost basis)
- Real-time portfolio metrics: Value, Return, Sharpe, Drawdown, Win Rate, Volatility, Beta
- Performance history chart over time

---

### 5. Live Market Data
Real-time crypto market data via CoinGecko and Kraken APIs.

- Live price, 24h change, and volume for BTC, ETH, SOL, ADA, XRP
- Historical OHLCV candlestick data for price charts
- **Kraken integration** for order book data and direct exchange connectivity
- Order book view (bids/asks, spread, depth)

---

### 6. AI Trading Assistant (Chat)
Multi-LLM conversational interface for trading analysis and strategy discussion.

- Supports **OpenAI GPT-5**, **Anthropic Claude** (Sonnet/Opus/Haiku 4.5), **Google Gemini Pro**
- Full chat history per session with clear/reset capability
- Portfolio context automatically available to the AI
- **Trade Signal Parsing**: AI responses are scanned for buy/sell/hold signals with confidence scores
- Streaming and non-streaming response modes

---

### 7. LLM Arena
Side-by-side AI model comparison tool for evaluating different providers on the same prompt.

- Submit a single prompt to multiple LLM providers simultaneously
- View responses side-by-side for direct comparison
- Switch between providers (OpenAI / Anthropic / Gemini) and model variants
- Useful for benchmarking AI quality for trading use cases

---

### 8. Risk Management
Server-side risk enforcement layer that validates trades before execution.

- Configurable limits: max position size, max positions per symbol, max total positions
- Portfolio-level limits: max portfolio risk %, daily loss limit, max drawdown
- Per-trade controls: default stop loss %, default take profit %
- Automatic validation against active portfolio state
- Risk alerts broadcast via WebSocket in real time

---

### 9. Settings
Persistent configuration panel with PostgreSQL-backed storage.

- **Display:** Dark mode, refresh interval (5s / 10s / 30s / 1m), auto-refresh
- **Trading:** Default position size, risk limit %, max positions, auto stop-loss
- **Exchange:** Select active exchange (Binance, Coinbase, Kraken, Alpaca, CoinGecko)
- **Alerts:** Trade alerts, performance alerts, system alerts, email notifications
- Settings persisted to PostgreSQL via Drizzle ORM (falls back to in-memory if no DB)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/strategies` | List all strategies |
| GET | `/api/strategies/:id` | Get a strategy |
| POST | `/api/strategies` | Create strategy |
| PATCH | `/api/strategies/:id` | Update strategy |
| DELETE | `/api/strategies/:id` | Delete strategy |
| GET | `/api/trades` | List all trades |
| POST | `/api/trades` | Log a trade |
| GET | `/api/backtests` | List backtest results |
| POST | `/api/backtests` | Save a backtest record |
| PATCH | `/api/backtests/:id` | Update a backtest |
| POST | `/api/backtests/run` | Execute a backtest simulation |
| GET | `/api/portfolio/metrics` | Get portfolio metrics |
| GET | `/api/portfolio/performance` | Get performance history |
| GET | `/api/markets` | Get live market data |
| GET | `/api/markets/price` | Get historical price data |
| GET | `/api/markets/orderbook` | Get order book (Kraken) |
| GET | `/api/chat/messages` | Get chat history |
| POST | `/api/chat` | Send message to LLM |
| DELETE | `/api/chat/messages` | Clear chat history |
| GET | `/api/llm/status` | LLM provider status |
| GET | `/api/risk/assessment` | Current risk assessment |
| PUT | `/api/risk/settings` | Update risk settings |
| GET | `/api/settings` | Get app settings |
| PUT | `/api/settings` | Update app settings |
| GET | `/api/kraken/ticker` | Kraken ticker data |
| GET | `/api/kraken/ohlcv` | Kraken OHLCV data |

---

## Technology Stack

### Frontend (`@app/client`)
| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Routing | Wouter |
| Server State | TanStack Query v5 |
| Forms | React Hook Form + Zod |
| UI Components | shadcn/ui (Radix UI primitives) |
| Styling | Tailwind CSS (dark theme) |
| Charts | Recharts |
| Animations | Framer Motion |
| Real-time | Socket.IO Client |
| Build | Vite |

### Backend (`@app/server`)
| Layer | Technology |
|---|---|
| Runtime | Node.js + TypeScript (tsx) |
| Framework | Express.js |
| Real-time | Socket.IO |
| Validation | Zod |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Neon) — optional |
| AI — OpenAI | openai SDK (GPT-5) |
| AI — Anthropic | @anthropic-ai/sdk (Claude 4.5) |
| AI — Google | @google/generative-ai (Gemini Pro) |

### Shared (`@app/shared`)
| Layer | Technology |
|---|---|
| Type Safety | Zod schemas + TypeScript |
| DB Schema | Drizzle ORM table definitions |
| Validation | drizzle-zod insert schemas |

### Infrastructure
| Concern | Approach |
|---|---|
| Monorepo | NPM Workspaces (`packages/*`) |
| Dev Server | Vite (served through Express middleware) |
| DB Migrations | Drizzle Kit (`drizzle-kit push`) |
| Deployment | Replit Autoscale |
