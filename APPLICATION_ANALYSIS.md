# Praxis - Algorithmic Trading Analytics Platform

## Application Analysis

**Application Name:** Praxis  
**Type:** Full-Stack Algorithmic Trading Analytics Dashboard  
**Stack:** React + Express + TypeScript + PostgreSQL (optional) + OpenAI Integration

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (React + Vite)                          │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                            App.tsx (Router)                            │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    Pages (7 Main Views)                         │   │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌───────────┐ ┌─────────┐           │   │ │
│  │  │  │ Overview │ │Strategies│ │Backtesting│ │Portfolio│           │   │ │
│  │  │  └──────────┘ └──────────┘ └───────────┘ └─────────┘           │   │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐                        │   │ │
│  │  │  │ Markets  │ │  Chat    │ │ Settings │                        │   │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘                        │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    Components                                   │   │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │   │ │
│  │  │  │Dashboard │ │Backtesting│ │ Trades  │ │ Layout  │           │   │ │
│  │  │  │ Widgets  │ │  Forms   │ │  Forms  │ │(Sidebar)│           │   │ │
│  │  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  │                                                                        │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │ │
│  │  │                    Services                                     │   │ │
│  │  │  ┌──────────────────────────────────────────────────────────┐   │   │ │
│  │  │  │              TradingService (API Client)                 │   │   │ │
│  │  │  │  - Strategy CRUD    - Trade Management                   │   │   │ │
│  │  │  │  - Backtest Runner  - Portfolio Metrics                  │   │   │ │
│  │  │  │  - Market Data      - Chat/AI Integration                │   │   │ │
│  │  │  └──────────────────────────────────────────────────────────┘   │   │ │
│  │  └─────────────────────────────────────────────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      │ HTTP/REST API
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVER (Express + Node.js)                         │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                         routes.ts (API Layer)                          │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │  │ /api/strategies  │ /api/trades    │ /api/backtests             │  │ │
│  │  │ /api/portfolio   │ /api/markets   │ /api/chat                  │  │ │
│  │  │ /api/settings                                                   │  │ │
│  │  └──────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │                      storage.ts (Data Layer)                           │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐  │ │
│  │  │                    MemStorage (In-Memory)                       │  │ │
│  │  │  - Strategies Map   - Trades Map      - Backtests Map          │  │ │
│  │  │  - Market Data      - Performance     - Chat Messages          │  │ │
│  │  │  - Portfolio Metrics                                           │  │ │
│  │  └──────────────────────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│                                      ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │               External Integrations                                    │ │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────────────┐   │ │
│  │  │   CoinGecko    │  │    OpenAI      │  │   PostgreSQL (Neon)    │   │ │
│  │  │ (Market Data)  │  │  (AI Chat)     │  │   (Settings Only)      │   │ │
│  │  └────────────────┘  └────────────────┘  └────────────────────────┘   │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Data Model Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA MODELS                                    │
└─────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────┐       ┌───────────────────────┐
│       Strategy        │       │         Trade         │
├───────────────────────┤       ├───────────────────────┤
│ id: string            │───┐   │ id: string            │
│ name: string          │   │   │ symbol: string        │
│ description: string   │   │   │ type: "buy" | "sell"  │
│ type: StrategyType    │   └──►│ quantity: number      │
│ status: Status        │       │ price: number         │
│ performance: number   │       │ pnl: number           │
│ sharpeRatio: number   │       │ timestamp: Date       │
│ maxDrawdown: number   │       │ strategyId: string    │
│ winRate: number       │       └───────────────────────┘
│ totalTrades: number   │
│ createdAt: Date       │       ┌───────────────────────┐
└───────────────────────┘       │    BacktestResult     │
                                ├───────────────────────┤
┌───────────────────────┐       │ id: string            │
│      MarketData       │       │ strategyName: string  │
├───────────────────────┤       │ strategyDescription   │
│ id: string            │       │ startDate: Date       │
│ symbol: string        │       │ endDate: Date         │
│ name: string          │       │ totalReturn: number   │
│ price: number         │       │ sharpeRatio: number   │
│ change: number        │       │ maxDrawdown: number   │
│ changePercent: number │       │ winRate: number       │
│ volume: number        │       │ totalTrades: number   │
│ timestamp: Date       │       │ status: BacktestStatus│
└───────────────────────┘       │ createdAt: Date       │
                                └───────────────────────┘
┌───────────────────────┐
│    PortfolioMetrics   │       ┌───────────────────────┐
├───────────────────────┤       │      ChatMessage      │
│ totalValue: number    │       ├───────────────────────┤
│ totalReturn: number   │       │ id: string            │
│ totalReturnPercent    │       │ role: "user"|"assistant"
│ sharpeRatio: number   │       │ content: string       │
│ maxDrawdown: number   │       │ timestamp: Date       │
│ winRate: number       │       │ context?: any         │
│ volatility: number    │       └───────────────────────┘
│ beta: number          │
└───────────────────────┘       ┌───────────────────────┐
                                │       Settings        │
┌───────────────────────┐       ├───────────────────────┤
│    PerformanceData    │       │ id: string            │
├───────────────────────┤       │ refreshInterval       │
│ date: Date            │       │ darkMode: boolean     │
│ portfolioValue: number│       │ notifications: boolean│
│ benchmarkValue: number│       │ autoRefresh: boolean  │
│ drawdown: number      │       │ defaultPositionSize   │
└───────────────────────┘       │ riskLimit: number     │
                                │ maxPositions: number  │
┌───────────────────────┐       │ autoStopLoss: boolean │
│      PriceData        │       │ exchange?: string     │
├───────────────────────┤       │ tradeAlerts: boolean  │
│ timestamp: Date       │       │ performanceAlerts     │
│ open: number          │       │ systemAlerts: boolean │
│ high: number          │       │ email?: string        │
│ low: number           │       └───────────────────────┘
│ close: number         │
│ volume: number        │
└───────────────────────┘
```

---

## Feature Breakdown

### 1. Dashboard Overview
**Description:** Central hub displaying key portfolio metrics, performance charts, active strategies, market data, recent trades, and backtest results at a glance.

| Component | Location | Purpose |
|-----------|----------|---------|
| Overview Page | [`client/src/pages/Overview.tsx`](client/src/pages/Overview.tsx) | Main dashboard container |
| MetricsGrid | [`client/src/components/dashboard/MetricsGrid.tsx`](client/src/components/dashboard/MetricsGrid.tsx) | Displays key KPIs (Total Value, Returns, Sharpe, Win Rate) |
| PerformanceChart | [`client/src/components/dashboard/PerformanceChart.tsx`](client/src/components/dashboard/PerformanceChart.tsx) | Portfolio vs benchmark visualization |
| StrategyList | [`client/src/components/dashboard/StrategyList.tsx`](client/src/components/dashboard/StrategyList.tsx) | Quick strategy performance summary |
| MarketChart | [`client/src/components/dashboard/MarketChart.tsx`](client/src/components/dashboard/MarketChart.tsx) | Live price chart visualization |
| TradeHistory | [`client/src/components/dashboard/TradeHistory.tsx`](client/src/components/dashboard/TradeHistory.tsx) | Recent trades table |
| BacktestingTable | [`client/src/components/dashboard/BacktestingTable.tsx`](client/src/components/dashboard/BacktestingTable.tsx) | Backtest results summary |

---

### 2. Strategy Management
**Description:** Full CRUD operations for trading strategies with detailed metrics tracking including performance, Sharpe ratio, max drawdown, and win rate.

| Component | Location | Purpose |
|-----------|----------|---------|
| Strategies Page | [`client/src/pages/Strategies.tsx`](client/src/pages/Strategies.tsx) | Strategy list and management UI |
| Strategy Form | [`client/src/components/strategies/`](client/src/components/strategies/) | Create/edit strategy forms |
| API Routes | [`server/routes.ts`](server/routes.ts) (lines 18-78) | REST endpoints for CRUD |
| Storage | [`server/storage.ts`](server/storage.ts) (lines 270-304) | Data persistence layer |

**Strategy Types Supported:**
- Momentum
- Mean Reversion
- Trend Following
- Arbitrage

---

### 3. Backtesting Engine
**Description:** Historical strategy testing with configurable parameters including date range, initial capital, and symbol selection. Generates comprehensive performance metrics.

| Component | Location | Purpose |
|-----------|----------|---------|
| Backtesting Page | [`client/src/pages/Backtesting.tsx`](client/src/pages/Backtesting.tsx) | Backtest configuration & results |
| BacktestForm | [`client/src/components/backtesting/BacktestForm.tsx`](client/src/components/backtesting/BacktestForm.tsx) | Parameter input form |
| BacktestDetail | [`client/src/components/backtesting/BacktestDetail.tsx`](client/src/components/backtesting/BacktestDetail.tsx) | Individual result display |
| BacktestComparison | [`client/src/components/backtesting/BacktestComparison.tsx`](client/src/components/backtesting/BacktestComparison.tsx) | Side-by-side comparison |
| Run Backtest API | [`server/routes.ts`](server/routes.ts) (lines 140-211) | Monte Carlo simulation engine |

**Backtest Metrics Generated:**
- Total Return (%)
- Sharpe Ratio
- Maximum Drawdown
- Win Rate
- Total Trades

---

### 4. Portfolio Management
**Description:** Complete portfolio tracking with trade logging, P&L calculation, and performance analytics. Supports buy/sell operations with automatic profit/loss tracking.

| Component | Location | Purpose |
|-----------|----------|---------|
| Portfolio Page | [`client/src/pages/Portfolio.tsx`](client/src/pages/Portfolio.tsx) | Portfolio dashboard |
| TradeForm | [`client/src/components/trades/TradeForm.tsx`](client/src/components/trades/TradeForm.tsx) | Log new trades |
| Metrics API | [`server/routes.ts`](server/routes.ts) (lines 213-239) | Portfolio metrics endpoint |
| P&L Calculator | [`server/storage.ts`](server/storage.ts) (lines 320-368) | Automatic P&L calculation |

**Portfolio Metrics:**
- Total Portfolio Value
- Total Return / Return %
- Sharpe Ratio
- Max Drawdown
- Win Rate
- Volatility
- Beta

---

### 5. Live Market Data
**Description:** Real-time cryptocurrency market data integration via CoinGecko API with price charts, volume, and 24h change indicators.

| Component | Location | Purpose |
|-----------|----------|---------|
| Markets Page | [`client/src/pages/Markets.tsx`](client/src/pages/Markets.tsx) | Market overview & charts |
| Market API | [`server/routes.ts`](server/routes.ts) (lines 241-319) | CoinGecko integration |
| Price Chart API | [`server/routes.ts`](server/routes.ts) (lines 274-319) | Historical OHLCV data |

**Supported Markets:**
- BTC/USD (Bitcoin)
- ETH/USD (Ethereum)
- SOL/USD (Solana)
- ADA/USD (Cardano)
- XRP/USD (Ripple)

---

### 6. AI Trading Assistant
**Description:** GPT-5 powered conversational AI that provides trading insights, strategy recommendations, and portfolio analysis with full context awareness.

| Component | Location | Purpose |
|-----------|----------|---------|
| Chat Page | [`client/src/pages/Chat.tsx`](client/src/pages/Chat.tsx) | Chat interface |
| Chat API | [`server/routes.ts`](server/routes.ts) (lines 337-424) | OpenAI integration |
| Message Storage | [`server/storage.ts`](server/storage.ts) (lines 464-480) | Chat history persistence |

**AI Capabilities:**
- Portfolio analysis
- Strategy recommendations
- Market insights
- Risk assessment
- Performance explanations

---

### 7. Settings & Configuration
**Description:** Comprehensive settings panel for trading parameters, notifications, display preferences, and exchange configuration.

| Component | Location | Purpose |
|-----------|----------|---------|
| Settings Page | [`client/src/pages/Settings.tsx`](client/src/pages/Settings.tsx) | Settings form interface |
| Settings API | [`server/routes.ts`](server/routes.ts) (lines 355-375) | Settings CRUD |
| DB Persistence | [`server/storage.ts`](server/storage.ts) (lines 482-578) | PostgreSQL storage |
| Schema | [`shared/schema.ts`](shared/schema.ts) (lines 5-20) | Settings table definition |

**Configurable Options:**
- Refresh Interval (5s, 10s, 30s, 1m)
- Dark Mode toggle
- Auto Refresh
- Default Position Size
- Risk Limit (%)
- Max Positions
- Auto Stop Loss
- Exchange Selection (Binance, Coinbase, Kraken, Alpaca)
- Alert Preferences (Trade, Performance, System)
- Email Notifications

---

## API Endpoints Summary

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/strategies` | List all strategies |
| GET | `/api/strategies/:id` | Get strategy by ID |
| POST | `/api/strategies` | Create new strategy |
| PATCH | `/api/strategies/:id` | Update strategy |
| DELETE | `/api/strategies/:id` | Delete strategy |
| GET | `/api/trades` | List all trades |
| POST | `/api/trades` | Log new trade |
| GET | `/api/backtests` | List backtest results |
| POST | `/api/backtests` | Create backtest record |
| PATCH | `/api/backtests/:id` | Update backtest |
| POST | `/api/backtests/run` | Execute backtest simulation |
| GET | `/api/portfolio/metrics` | Get portfolio metrics |
| GET | `/api/portfolio/performance` | Get performance history |
| GET | `/api/markets` | Get live market data |
| GET | `/api/markets/price` | Get price history |
| GET | `/api/chat/messages` | Get chat history |
| POST | `/api/chat` | Send message to AI |
| DELETE | `/api/chat/messages` | Clear chat history |
| GET | `/api/settings` | Get settings |
| PUT | `/api/settings` | Update settings |

---

## Technology Stack

### Frontend
- **Framework:** React 18 with TypeScript
- **Routing:** Wouter
- **State Management:** TanStack Query v5
- **Forms:** React Hook Form + Zod
- **Styling:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **Build Tool:** Vite

### Backend
- **Runtime:** Node.js with Express
- **Language:** TypeScript (tsx)
- **Validation:** Zod
- **Database ORM:** Drizzle ORM
- **Database:** PostgreSQL (Neon) - optional, falls back to in-memory

### External APIs
- **Market Data:** CoinGecko API (free tier)
- **AI Chat:** OpenAI GPT-5

---

## File Structure

```
├── client/
│   └── src/
│       ├── App.tsx                    # Main app & routing
│       ├── components/
│       │   ├── backtesting/           # Backtest-specific components
│       │   ├── dashboard/             # Dashboard widgets
│       │   ├── layout/                # Sidebar, Header
│       │   ├── strategies/            # Strategy components
│       │   ├── trades/                # Trade components
│       │   └── ui/                    # shadcn/ui components
│       ├── hooks/                     # Custom React hooks
│       ├── lib/                       # Utilities, query client
│       ├── pages/                     # Page components
│       └── services/
│           └── tradingServices.ts     # API client
├── server/
│   ├── index.ts                       # Server entry point
│   ├── routes.ts                      # API routes
│   ├── storage.ts                     # Data layer
│   ├── db.ts                          # Database connection
│   └── vite.ts                        # Vite dev server config
├── shared/
│   └── schema.ts                      # Shared types & validation
└── package.json
```
