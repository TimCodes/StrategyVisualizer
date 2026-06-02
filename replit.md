# Praxis - Trading Dashboard Application

## Overview

Praxis is a comprehensive trading dashboard application built for algorithmic trading strategy management and analysis. The platform provides real-time market data visualization, portfolio analytics, strategy backtesting capabilities, and trade execution monitoring. The application uses a **monorepo architecture** with NPM Workspaces, with a React frontend, Express backend, and PostgreSQL database integration through Drizzle ORM.

## Monorepo Structure

```
/
├── packages/
│   ├── client/          (@app/client)  — React/Vite frontend
│   │   ├── package.json
│   │   ├── index.html
│   │   └── src/
│   ├── server/          (@app/server)  — Express API + WebSocket
│   │   ├── package.json
│   │   ├── index.ts
│   │   ├── routes/
│   │   └── services/
│   └── shared/          (@app/shared)  — Shared types & schema
│       ├── package.json
│       └── schema.ts
├── package.json         — Root workspace config (workspaces: ["packages/*"])
├── vite.config.ts       — Points to packages/client
├── tsconfig.json        — Path aliases for @/* and @shared/*
├── drizzle.config.ts    — Points to packages/shared/schema.ts
└── tailwind.config.ts   — Content paths for packages/client
```

The workflow runs: `NODE_ENV=development tsx packages/server/index.ts`

## User Preferences

Preferred communication style: Simple, everyday language. Direct and focused responses without promotional language or selling.

## Safety Boundaries (Simulated Mode)

### Backtest Data Source Tagging
- All backtest results carry a `dataSource` field: `"simulated"` | `"live_engine"`, defaulting to `"simulated"`.
- Both the general backtest schema (`backtestResultSchema`) and LEAN backtest schema (`leanBacktestSchema`) include this field, as does the `lean_backtests` DB table.
- Every backtest created by the current code paths explicitly sets `dataSource: "simulated"` because both engines (`routes/backtests.ts` POST /api/backtests/run and `routes/lean.ts` LEAN backtest stream) use `Math.random()` internally.
- When a real backtest engine replaces the simulator, set `dataSource: "live_engine"` at that time — the "Simulated" badges in the UI will disappear automatically for those results.

### Live Trading Guard
- **`packages/server/lib/liveTrading.ts`** is the single source of truth: `isLiveTradingEnabled()` returns `true` only when env var `LIVE_TRADING_ENABLED=true` or `=1`.
- **Default is `false` (unset = blocked).** This env var must not be set to `true` until a real backtest engine replaces the simulator.
- Every real broker order placement is guarded before the exchange call:
  - `POST /api/ibkr/order` — calls `ibkr.placeOrder()` (IBKR)
  - `POST /api/kraken/order` — calls `kraken.placeOrder()` via `AddOrder` (Kraken)
  - `POST /api/trades` — calls `storage.createTrade()` (internal trades)
  - All return HTTP 403 with `{ error: "Live trading is disabled. Backtests are simulated; live orders are blocked." }` when blocked.
- Read-only connector operations (balance, positions, market data, order book) are NOT affected.

### System Status Endpoint
- `GET /api/system/status` returns `{ liveTradingEnabled: boolean, backtestEngine: "simulated" }`.
- The frontend fetches this on load to drive the persistent warning banner and any UI feature gating.

### UI Indicators
- A persistent yellow banner is shown at the top of all pages while `liveTradingEnabled` is `false`: *"Simulated mode — backtest results are randomly generated and live trading is disabled."*
- Every backtest result row/card shows a yellow **Simulated** badge driven by the `dataSource` field.

## Recent Changes

- **March 15, 2026**: Added three major new features — LEAN Strategy Editor, Monaco Code Editor, and AI Strategy Agent:
  - **Strategy Editor Page** (`/editor`): Full VS Code-like Python editor using Monaco with LEAN-specific autocomplete, syntax highlighting, and keyboard shortcuts
  - **AI Strategy Agent**: OpenAI-powered agent that generates complete runnable LEAN Python strategies from natural language descriptions, with refine/explain/optimize modes
  - **8 Strategy Templates**: Pre-built templates for MA Crossover, RSI Mean Reversion, Bollinger Bands, MACD Momentum, Multi-Asset Rotation, Pairs Trading, Crypto Momentum, Volatility Breakout
  - **LEAN Backtest Engine**: Simulated backtest execution with real-time streaming logs via Socket.IO, equity curve visualization, and full metrics (Sharpe, Drawdown, Win Rate)
  - **Project Management**: Create, save, load, and delete LEAN projects with persistent in-memory storage
  - **New Routes**: `/api/lean/projects`, `/api/lean/agent/generate`, `/api/lean/agent/refine`, `/api/lean/agent/explain`, `/api/lean/agent/optimize`
  - **New Sidebar Entry**: "Editor" navigation item added between Strategies and Backtesting

- **February 3, 2026**: Completed TradeWithAI feature integration:
  - **Multi-LLM Integration**: Added support for OpenAI GPT-5, Anthropic Claude (Sonnet/Opus/Haiku 4.5), and Google Gemini Pro
  - **WebSocket Real-Time Communication**: Socket.IO-based real-time updates for signals, trades, and risk alerts
  - **LLM Arena**: New page for side-by-side AI model comparison at `/arena`
  - **Trade Signal Parsing**: NLP extraction of buy/sell signals from AI responses with confidence levels
  - **Risk Management System**: Position limits, drawdown monitoring, and trade validation
- **February 3, 2026**: Created comparative analysis document (`TradeWithAI_vs_Praxis_Analysis.md`)
- **February 3, 2026**: Created implementation plan (`IMPLEMENTATION_PLAN.md`)

## New Features (TradeWithAI Integration)

### Multi-LLM Provider System
- Provider abstraction layer in `server/services/llm/`
- Supports: OpenAI GPT-5, Claude Sonnet/Opus/Haiku 4.5, Gemini Pro
- Streaming and non-streaming response modes
- Provider status monitoring via `/api/llm/status`

### WebSocket Real-Time Layer
- Socket.IO server in `server/ws.ts`
- Event types: `market:tick`, `portfolio:update`, `trade:executed`, `risk:alert`, `signal:detected`
- Room-based subscriptions for targeted updates
- Client hooks in `client/src/hooks/useSocket.ts`

### LLM Arena
- New page at `/arena` for model comparison
- Side-by-side response display with timing metrics
- Voting system for response quality
- Signal detection from each model's response

### Trade Signal Parser
- NLP extraction in `server/services/signalParser.ts`
- Detects buy/sell/hold signals with confidence levels
- Extracts entry price, stop-loss, take-profit targets
- Provides reasoning summaries

### Risk Management
- Risk service in `server/services/risk.ts`
- Position size limits and validation
- Drawdown monitoring with alerts
- Daily loss limits
- Trade blocking when limits exceeded

### Order Book Visualization
- Order book component in `client/src/components/markets/OrderBook.tsx`
- Real-time bid/ask display with price levels
- Visual depth chart showing market liquidity
- Spread calculation and display
- Auto-refresh every 5 seconds
- API endpoint: `/api/markets/orderbook?symbol=<symbol>`

### Kraken Exchange Integration
- Kraken API service in `server/services/exchanges/kraken.ts`
- Public endpoints (no API key needed): ticker, OHLC, order book, asset pairs
- Private endpoints (requires API key): balance, orders, trading
- Selectable in Settings page under "Exchange"
- API endpoints:
  - `GET /api/kraken/markets` - All market tickers
  - `GET /api/kraken/ticker?symbol=BTC/USD` - Single ticker
  - `GET /api/kraken/ohlc?symbol=BTC/USD&interval=1440` - OHLC data
  - `GET /api/kraken/orderbook?symbol=BTC/USD` - Order book
  - `GET /api/kraken/balance` - Account balance (requires API key)
  - `POST /api/kraken/order` - Place order (requires API key)
- Environment variables: `KRAKEN_API_KEY`, `KRAKEN_API_SECRET`

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript for type safety and modern development experience
- **Routing**: Wouter for lightweight client-side routing with support for nested routes
- **State Management**: TanStack Query (React Query) for server state management, providing caching, background updates, and optimistic updates
- **UI Components**: Radix UI primitives with custom shadcn/ui components for accessible and consistent design
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **Build System**: Vite for fast development builds and hot module replacement

### Backend Architecture
- **Framework**: Express.js with TypeScript for type-safe server development
- **API Design**: RESTful API structure with `/api` prefix for all backend routes
- **Middleware**: Custom logging middleware for request/response monitoring and error handling
- **Development**: Hot reload capability with tsx for seamless development experience
- **Storage Interface**: Abstracted storage layer with in-memory implementation (MemStorage) that can be easily swapped for database implementations

### Data Layer
- **ORM**: Drizzle ORM configured for PostgreSQL with type-safe schema definitions
- **Database**: PostgreSQL with Neon serverless database integration
- **Schema Management**: Centralized schema definitions in `shared/schema.ts` using Zod for validation
- **Migrations**: Drizzle Kit for database schema migrations and version control

### UI/UX Design System
- **Theme**: Dark mode optimized color scheme with CSS custom properties
- **Typography**: Inter font family for clean, readable interface
- **Components**: Comprehensive component library including data visualizations, forms, and navigation
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Accessibility**: ARIA-compliant components using Radix UI primitives

### Data Models
The application manages several core trading entities:
- **Strategies**: Trading algorithms with performance metrics and status tracking
- **Market Data**: Real-time price feeds and trading instruments
- **Trades**: Individual trade executions with P&L tracking and risk validation
- **Backtest Results**: Historical strategy performance analysis
- **Portfolio Metrics**: Aggregate performance and risk metrics
- **Chat Messages**: AI assistant conversations with multi-LLM support and signal detection
- **Trade Signals**: AI-detected trading signals with confidence levels
- **Risk Settings**: Position limits, drawdown thresholds, and validation rules

### Development Workflow
- **Monorepo Structure**: Shared types and utilities between frontend and backend
- **Type Safety**: End-to-end TypeScript with shared schema validation
- **Hot Reload**: Development server with automatic rebuilds and browser refresh
- **Build Process**: Separate build targets for client (Vite) and server (esbuild) with optimized production bundles

## External Dependencies

### Database & Storage
- **Neon Database**: Serverless PostgreSQL hosting with connection pooling
- **Drizzle ORM**: Type-safe database toolkit with schema migrations
- **connect-pg-simple**: PostgreSQL session store for Express sessions

### UI & Visualization
- **Radix UI**: Headless UI primitives for accessibility and customization
- **Recharts**: React charting library for financial data visualization
- **Lucide React**: Icon library with consistent visual design
- **TailwindCSS**: Utility-first CSS framework with design system integration

### Development & Build Tools
- **Vite**: Frontend build tool with development server and hot reload
- **TypeScript**: Static type checking across the entire application
- **ESBuild**: Fast JavaScript bundler for server-side code
- **React Hook Form**: Form state management with validation

### Data Management
- **TanStack Query**: Server state management with caching and synchronization
- **Zod**: Runtime type validation and schema definition
- **Date-fns**: Date manipulation and formatting utilities

### Development Environment
- **Replit Integration**: Cloud development environment with live preview
- **TSX**: TypeScript execution engine for development server
- **PostCSS**: CSS processing with Tailwind CSS integration