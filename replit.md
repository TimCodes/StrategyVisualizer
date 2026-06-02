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
- **`packages/server/lib/liveTrading.ts`** is the single source of truth.
  - `isLiveTradingEnabled()` returns `true` ONLY when `LIVE_TRADING_ENABLED` is exactly the string `"true"`. Anything else (unset, `"false"`, `"1"`, `"yes"`) returns `false` — **fail-closed by design**.
  - `LiveTradingDisabledError extends Error` carries the canonical message used at both layers.
- **Default is `false` (unset = blocked).** Do NOT set to `"true"` until a real backtest engine replaces the random-number simulator.
- **Defense in depth — two independent guard layers:**
  - **Service layer (primary safety net):** `ibkr.placeOrder()` and `kraken.placeOrder()` each call `isLiveTradingEnabled()` at the very top, before any network request. They `throw new LiveTradingDisabledError()` and log a warning including connector name, symbol/pair, and side. This means any future route that calls `placeOrder` directly is still blocked.
  - **Route layer (clean HTTP surface):** `POST /api/ibkr/order` and `POST /api/kraken/order` check `isLiveTradingEnabled()` before calling the service and return `HTTP 403 { error: "...", liveTradingEnabled: false }`. A `catch` block additionally converts a `LiveTradingDisabledError` thrown from the service into the same 403 rather than a 500.
- **Scope is exactly order placement only:**
  - `POST /api/ibkr/order` → `ibkr.placeOrder()` — **blocked**
  - `POST /api/kraken/order` → `kraken.placeOrder()` via `AddOrder` — **blocked**
  - `POST /api/trades` (records a trade in storage, does NOT call any broker) — **not affected**
  - `getOrders`, `getOpenOrders`, `cancelOrder`, `getBalance`, `getPositions`, market data — **not affected**
- **No other callers exist.** A full search of `packages/server` for `.placeOrder(` found exactly these two call sites (routes/ibkr.ts and routes/kraken.ts) — no others.

### System Status Endpoint
- `GET /api/system/status` returns `{ liveTradingEnabled: boolean, backtestEngine: "simulated" }`.
- The frontend fetches this on load to drive the persistent warning banner and any UI feature gating.

### UI Indicators
- A persistent yellow banner is shown at the top of all pages while `liveTradingEnabled` is `false`: *"Simulated mode — backtest results are randomly generated and live trading is disabled."*
- Every backtest result row/card shows a yellow **Simulated** badge driven by the `dataSource` field.

## Strategy Pipeline State Machine

Every strategy carries three pipeline metadata fields (separate from the operational `status` field):

### Fields
- **`stage`** (`PipelineStage`) — where in the development pipeline the strategy sits. Ordered stages:
  `idea → feasibility → walk_forward → monte_carlo → incubation → diversification_sizing → live`
- **`gateStatus`** (`GateStatus`) — current gate outcome: `in_progress | passed | failed | discarded`
- **`gateHistory`** (`GateHistoryEntry[]`) — append-only log of every gate decision, each entry carrying `{ stage, result, note?, at }`

### Defaults
New strategies always start at `stage: "idea"`, `gateStatus: "in_progress"`, `gateHistory: []`.

### Transition Rules (server-enforced, one step at a time)
- **passed**: advance exactly one stage and reset `gateStatus = "in_progress"`; if already at `"live"`, set `gateStatus = "passed"`.
- **failed**: keep current stage, set `gateStatus = "failed"`.
- **discarded**: keep current stage, set `gateStatus = "discarded"`.

Every transition appends one entry to `gateHistory` recording the stage it occurred at and a timestamp.

### API
- `POST /api/strategies/:id/gate` — body: `{ result: "passed" | "failed" | "discarded", note?: string }`. Returns the updated strategy. 404 if not found, 400 on invalid body.
- Generic `PATCH /api/strategies/:id` **cannot** mutate `stage`, `gateStatus`, or `gateHistory` — those keys are stripped; gate transitions must go through the dedicated endpoint.

### Persistence Note
Strategies (including pipeline state) are stored **in-memory** (MemStorage). All state resets on server restart. Persisting strategies to Postgres is a separate future step.

### UI
- Each strategy card on `/strategies` shows a **stage badge** (e.g. "Live", "Idea") and a **gate-status badge** (color-coded: green = passed, amber = in progress, red = failed, gray = discarded).
- A **"Gate Review" dropdown** on each card provides Pass Gate / Fail Gate / Discard actions that POST to `/api/strategies/:id/gate` and immediately refetch.
- The dashboard `StrategyList` widget also shows the stage and gate-status badges in compact form.

## AI Strategy Agent — Discipline Guardrails

### Part A: Generation requires a stated edge + agent pushback

Every strategy generation request now requires a **stated edge** (`edge: string`, min 20 chars). The agent critiques the edge before generating any code.

- **`EDGE_CRITIQUE_SYSTEM_PROMPT`** in `lean-agent-prompt.ts`: instructs the model to act as a skeptical trading mentor. It evaluates only the edge the user wrote — it must **never** invent, supply, or strengthen an edge on the user's behalf. Judged on: (1) market mechanism and who persistently loses, (2) falsifiability vs. indicator restatement, (3) specificity.
- **`assessEdge(edge, description, model)`** in `lean-agent.ts`: calls the LLM, returns `{ verdict: "strong"|"weak"|"none", reasoning, questions }`. Parse failure falls back to `"weak"` rather than crashing.
- **Gate rule**: if verdict is `"weak"` or `"none"` and `acknowledgeWeakEdge` is not `true`, generation is **blocked** — returns `{ status: "needs_stronger_edge", assessment }` with no code. A strong verdict (or explicit override) proceeds and returns `{ status: "ok", code, …, edgeAssessment }`.
- `POST /api/lean/agent/generate` with no edge or edge < 20 chars → **400**.
- Strategy schema carries optional `edge` and `edgeAssessment` fields so the verdict persists when a strategy is saved.
- **UI** (`StrategyAgent.tsx`): required "What's your edge?" textarea with helper text blocks submit until filled. On `needs_stronger_edge`: shows reasoning + follow-up questions, no code. Two buttons: **"Revise my edge"** (primary) and **"Generate anyway"** (ghost/muted, discouraged override). On success: edge verdict badge shown beside the class name.

### Part B: Gated, logged refinement

The refine flow now **requires a type and rationale** and **gates optimizations** behind an explicit confirmation.

- `POST /api/lean/agent/refine` now requires `refinementType: "logic_fix"|"optimization"` and `rationale: string` (min 15 chars). Missing either → **400**.
- **Prompt discipline**: the `refineStrategy` function builds type-specific instructions:
  - `logic_fix`: implement only the stated correction; backtest metrics, if provided, are **context only** — they must not drive parameter changes.
  - `optimization`: implement only the stated change; explicitly note in the response that this raises overfitting risk; must not free-tune other parameters. Both variants include: "do not silently chase higher returns/Sharpe — only make the change the user articulated."
- **Optimization confirmation gate** (`routes/lean.ts`): if `refinementType === "optimization"` and `confirmedOptimization` is not `true`, the route returns `{ status: "confirm_optimization", trialCount, warning }` and does **not** refine. The client must re-send with `confirmedOptimization: true`.
- **Refinement logging**: on a successful refine, if `strategyId` is provided, `storage.appendRefinementLog(strategyId, { refinementType, rationale, at })` appends to `strategy.refinementHistory` — an append-only log of every change and why. The trial counter also fires.
- **UI** (`StrategyAgent.tsx`): two-card type selector (Logic Fix / Optimization with warning icon) + required rationale textarea. `confirm_optimization` response triggers a blocking warning panel showing trial count; user must click **"I understand — optimize"** (orange, non-default) to proceed.

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