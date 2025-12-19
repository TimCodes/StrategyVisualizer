# Trading Dashboard - Implementation Guide

## Executive Summary

This implementation guide provides a structured roadmap to transform the current frontend-only trading dashboard into a fully functional, production-ready application. The guide is organized into feature-based epics with user stories and technical tasks.

---

## Priority Matrix

| Priority | Epic | Estimated Effort | Business Value |
|----------|------|------------------|----------------|
| P0 | Backend API Foundation | 2 sprints | Critical - Enables all other features |
| P1 | Strategy Management | 1 sprint | High - Core trading functionality |
| P1 | Portfolio & Trade Management | 1 sprint | High - Core trading functionality |
| P2 | Backtesting Engine | 1.5 sprints | High - Key differentiator |
| P2 | AI Trading Assistant Integration | 1 sprint | High - Key differentiator |
| P3 | Market Data Management | 1 sprint | Medium - Enhanced user experience |
| P3 | Settings & Preferences | 0.5 sprint | Medium - User personalization |
| P4 | Real-time Data Feeds | 1.5 sprints | Low - Future enhancement |
| P4 | User Authentication | 1 sprint | Low - Future enhancement |

---

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT LAYER                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                    React + TypeScript + Vite                     │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────────┐│    │
│  │  │ Overview │ │Strategies│ │Backtesting│ │ Portfolio/Markets/   ││    │
│  │  │   Page   │ │   Page   │ │   Page   │ │ Chat/Settings Pages  ││    │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────────┬───────────┘│    │
│  │       │            │            │                   │            │    │
│  │  ┌────▼────────────▼────────────▼───────────────────▼───────┐   │    │
│  │  │              TanStack Query (State Management)           │   │    │
│  │  └───────────────────────────┬──────────────────────────────┘   │    │
│  │                              │                                   │    │
│  │  ┌───────────────────────────▼──────────────────────────────┐   │    │
│  │  │              TradingService (Data Layer)                  │   │    │
│  │  │         Currently: Mock Data with setTimeout              │   │    │
│  │  │         Future: API calls to /api/* endpoints             │   │    │
│  │  └──────────────────────────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (HTTP/REST - Future)
┌─────────────────────────────────────────────────────────────────────────┐
│                              SERVER LAYER                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                     Express.js + TypeScript                      │    │
│  │  ┌──────────────────┐  ┌──────────────────┐                     │    │
│  │  │  Request Logger  │  │  Error Handler   │                     │    │
│  │  └────────┬─────────┘  └────────┬─────────┘                     │    │
│  │           │                     │                                │    │
│  │  ┌────────▼─────────────────────▼─────────────────────────────┐ │    │
│  │  │                    Routes (/api/*)                          │ │    │
│  │  │              Currently: Empty/Stubbed                       │ │    │
│  │  └───────────────────────────┬────────────────────────────────┘ │    │
│  │                              │                                   │    │
│  │  ┌───────────────────────────▼────────────────────────────────┐ │    │
│  │  │              IStorage Interface                             │ │    │
│  │  │     ┌─────────────────┐    ┌─────────────────┐             │ │    │
│  │  │     │   MemStorage    │ ←→ │  DB (Drizzle)   │             │ │    │
│  │  │     │   (In-Memory)   │    │   (PostgreSQL)  │             │ │    │
│  │  │     └─────────────────┘    └─────────────────┘             │ │    │
│  │  └────────────────────────────────────────────────────────────┘ │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (Future)
┌─────────────────────────────────────────────────────────────────────────┐
│                              DATA LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                 PostgreSQL (Neon Serverless)                     │    │
│  │     Drizzle ORM | Zod Validation | Type-safe Queries            │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Data Models

```
┌──────────────────────┐       ┌──────────────────────┐
│      Strategy        │       │     MarketData       │
├──────────────────────┤       ├──────────────────────┤
│ id: string           │       │ id: string           │
│ name: string         │       │ symbol: string       │
│ description: string  │       │ name: string         │
│ type: enum           │       │ price: number        │
│ status: enum         │       │ change: number       │
│ performance: number  │       │ changePercent: number│
│ sharpeRatio: number  │       │ volume: number       │
│ maxDrawdown: number  │       │ timestamp: Date      │
│ winRate: number      │       └──────────────────────┘
│ totalTrades: number  │
│ createdAt: Date      │       ┌──────────────────────┐
└──────────┬───────────┘       │     PriceData        │
           │                   ├──────────────────────┤
           │ 1:N               │ timestamp: Date      │
           ▼                   │ open: number         │
┌──────────────────────┐       │ high: number         │
│       Trade          │       │ low: number          │
├──────────────────────┤       │ close: number        │
│ id: string           │       │ volume: number       │
│ symbol: string       │       └──────────────────────┘
│ type: buy|sell       │
│ quantity: number     │       ┌──────────────────────┐
│ price: number        │       │   BacktestResult     │
│ pnl: number          │       ├──────────────────────┤
│ timestamp: Date      │       │ id: string           │
│ strategyId: string ──┼───▶   │ strategyName: string │
└──────────────────────┘       │ totalReturn: number  │
                               │ sharpeRatio: number  │
┌──────────────────────┐       │ maxDrawdown: number  │
│  PortfolioMetrics    │       │ winRate: number      │
├──────────────────────┤       │ status: enum         │
│ totalValue: number   │       │ createdAt: Date      │
│ totalReturn: number  │       └──────────────────────┘
│ sharpeRatio: number  │
│ maxDrawdown: number  │
│ winRate: number      │
│ volatility: number   │
│ beta: number         │
└──────────────────────┘
```

---

## Epic 1: Backend API Foundation (P0)

**Goal:** Establish the backend infrastructure to support all application features

### User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-1.1 | As a frontend, I need API endpoints to fetch and persist trading data so the application works with real data instead of mocks. | Critical |
| US-1.2 | As a developer, I need a consistent error handling pattern so frontend can display meaningful error messages. | Critical |

### Task 1.1: Expand Storage Interface

**File:** `server/storage.ts`

Add CRUD operations to IStorage:

```typescript
export interface IStorage {
  // Strategies
  getStrategies(): Promise<Strategy[]>;
  getStrategyById(id: string): Promise<Strategy | null>;
  createStrategy(data: InsertStrategy): Promise<Strategy>;
  updateStrategy(id: string, data: Partial<InsertStrategy>): Promise<Strategy>;
  deleteStrategy(id: string): Promise<void>;
  
  // Trades
  getTrades(): Promise<Trade[]>;
  getTradesByStrategy(strategyId: string): Promise<Trade[]>;
  createTrade(data: InsertTrade): Promise<Trade>;
  
  // Backtests
  getBacktestResults(): Promise<BacktestResult[]>;
  createBacktest(data: InsertBacktest): Promise<BacktestResult>;
  updateBacktest(id: string, data: Partial<InsertBacktest>): Promise<BacktestResult>;
  
  // Portfolio
  getPortfolioMetrics(): Promise<PortfolioMetrics>;
  getPerformanceData(dateRange?: DateRange): Promise<PerformanceData[]>;
  
  // Markets
  getMarketData(): Promise<MarketData[]>;
}
```

**Acceptance Criteria:**
- [ ] All methods defined in interface
- [ ] MemStorage implements all methods
- [ ] Seed data populated for development

---

### Task 1.2: Implement API Routes

**File:** `server/routes.ts`

**Endpoints to implement:**

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/strategies` | List all strategies |
| GET | `/api/strategies/:id` | Get single strategy |
| POST | `/api/strategies` | Create strategy |
| PATCH | `/api/strategies/:id` | Update strategy |
| DELETE | `/api/strategies/:id` | Delete strategy |
| GET | `/api/trades` | List all trades |
| POST | `/api/trades` | Create trade |
| GET | `/api/backtests` | List backtest results |
| POST | `/api/backtests` | Create backtest |
| PATCH | `/api/backtests/:id` | Update backtest |
| GET | `/api/portfolio/metrics` | Get portfolio metrics |
| GET | `/api/portfolio/performance` | Get performance data |
| GET | `/api/markets` | Get market data |

**Acceptance Criteria:**
- [ ] All endpoints respond with proper JSON
- [ ] Request bodies validated with Zod schemas
- [ ] Appropriate HTTP status codes returned
- [ ] Error responses follow consistent format

---

### Task 1.3: Connect Frontend to API

**File:** `client/src/services/tradingServices.ts`

Refactor TradingService to use real API calls:

```typescript
export class TradingService {
  static async getStrategies(): Promise<Strategy[]> {
    const res = await fetch('/api/strategies');
    if (!res.ok) throw new Error('Failed to fetch strategies');
    return res.json();
  }

  static async createStrategy(data: InsertStrategy): Promise<Strategy> {
    const res = await fetch('/api/strategies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create strategy');
    return res.json();
  }

  // ... other methods
}
```

**Acceptance Criteria:**
- [ ] All service methods call real API endpoints
- [ ] mockData.ts no longer imported (can be deleted)
- [ ] Error states properly handled in UI

---

### Task 1.4: Add Insert Schemas for Validation

**File:** `shared/schema.ts`

```typescript
import { createInsertSchema } from 'drizzle-zod';

// Insert schemas (omit auto-generated fields)
export const insertStrategySchema = strategySchema.omit({ 
  id: true, 
  createdAt: true 
});

export const insertTradeSchema = tradeSchema.omit({ 
  id: true 
});

export const insertBacktestSchema = backtestResultSchema.omit({ 
  id: true, 
  createdAt: true 
});

// Types
export type InsertStrategy = z.infer<typeof insertStrategySchema>;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type InsertBacktest = z.infer<typeof insertBacktestSchema>;
```

**Acceptance Criteria:**
- [ ] Insert schemas properly exclude auto-generated fields
- [ ] Types exported for frontend and backend use

---

### Definition of Done - Epic 1
- [ ] All API endpoints return real data from storage
- [ ] Frontend successfully communicates with all endpoints
- [ ] Loading and error states work correctly
- [ ] No TypeScript errors

---

## Epic 2: Strategy Management (P1)

**Goal:** Enable full CRUD operations for trading strategies

### User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-2.1 | As a trader, I want to create new trading strategies so I can automate my trading approach. | High |
| US-2.2 | As a trader, I want to edit existing strategies so I can optimize their parameters. | High |
| US-2.3 | As a trader, I want to activate/deactivate strategies so I can control which ones are running. | High |
| US-2.4 | As a trader, I want to delete strategies I no longer need. | Medium |

### Task 2.1: Create Strategy Form Component

**File:** `client/src/components/strategies/StrategyForm.tsx`

**Form fields:**
- `name` (text input, required)
- `description` (textarea)
- `type` (select: momentum, mean_reversion, trend_following, arbitrage)
- `status` (select: active, inactive, paused)

**Implementation notes:**
- Use shadcn Form + react-hook-form
- Validate with insertStrategySchema
- Support create and edit modes

**Acceptance Criteria:**
- [ ] Form validates all required fields
- [ ] Submit triggers API call
- [ ] Success shows toast notification
- [ ] Cache invalidated after mutation

---

### Task 2.2: Add Strategy Dialog/Modal

**File:** `client/src/pages/Strategies.tsx`

**UI Changes:**
- Add "Create Strategy" button to header
- Open dialog with StrategyForm on click
- Add edit button to each strategy row
- Pre-populate form when editing

**Acceptance Criteria:**
- [ ] Dialog opens/closes properly
- [ ] Edit mode loads existing data
- [ ] Form submission closes dialog on success

---

### Task 2.3: Implement Strategy Status Toggle

**File:** `client/src/components/dashboard/StrategyList.tsx`

**Changes:**
- Add toggle switch for active/inactive status
- Implement optimistic update with TanStack Query
- Call `PATCH /api/strategies/:id` on toggle

**Acceptance Criteria:**
- [ ] Toggle updates immediately (optimistic)
- [ ] Reverts on API failure
- [ ] Visual feedback during update

---

### Task 2.4: Implement Strategy Deletion

**Files:** `StrategyList.tsx`, `Strategies.tsx`

**Changes:**
- Add delete button with confirmation dialog
- Call `DELETE /api/strategies/:id`
- Invalidate strategies cache

**Acceptance Criteria:**
- [ ] Confirmation dialog prevents accidental deletion
- [ ] Strategy removed from list after deletion
- [ ] Related trades are handled appropriately

---

### Definition of Done - Epic 2
- [ ] Traders can create, read, update, delete strategies
- [ ] All operations persist to storage
- [ ] UI reflects changes immediately
- [ ] Proper error handling for all operations

---

## Epic 3: Portfolio & Trade Management (P1)

**Goal:** Enable trade logging and portfolio metrics calculation

### User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-3.1 | As a trader, I want to log my trades so I can track my trading history. | High |
| US-3.2 | As a trader, I want to see my portfolio metrics update based on my trades. | High |
| US-3.3 | As a trader, I want to filter trades by strategy and date range. | Medium |

### Task 3.1: Create Trade Entry Form

**File:** `client/src/components/trades/TradeForm.tsx`

**Form fields:**
- `symbol` (text input with autocomplete)
- `type` (select: buy/sell)
- `quantity` (number input)
- `price` (number input)
- `strategyId` (select from active strategies)

**Notes:**
- P&L calculated on backend based on current price
- Timestamp auto-generated

**Acceptance Criteria:**
- [ ] Form validates all fields
- [ ] Strategy dropdown populated from API
- [ ] Trade appears in history after creation

---

### Task 3.2: Add Trade Filtering

**File:** `client/src/components/dashboard/TradeHistory.tsx`

**Filter options:**
- By strategy (dropdown)
- By symbol (text search)
- By type (buy/sell/all)
- By date range (date picker)

**Implementation:**
- Filters can be client-side or via query params
- Persist filter state in URL for shareability

**Acceptance Criteria:**
- [ ] Filters work independently and in combination
- [ ] Clear filters button resets all
- [ ] Empty state when no matches

---

### Task 3.3: Implement Portfolio Metrics Calculation

**File:** `server/storage.ts` (getPortfolioMetrics method)

**Calculations:**
| Metric | Formula |
|--------|---------|
| totalValue | Sum of all positions |
| totalReturn | Sum of all P&L |
| totalReturnPercent | (totalReturn / initialValue) * 100 |
| sharpeRatio | Calculated from returns data |
| maxDrawdown | Max peak-to-trough decline |
| winRate | (profitable trades / total trades) * 100 |

**Acceptance Criteria:**
- [ ] Metrics update when new trades added
- [ ] Calculations are accurate
- [ ] Dashboard reflects real-time metrics

---

### Definition of Done - Epic 3
- [ ] Traders can log new trades
- [ ] Trade history displays with filtering
- [ ] Portfolio metrics calculate from trade data
- [ ] MetricsGrid shows accurate, live data

---

## Epic 4: Backtesting Engine (P2)

**Goal:** Enable strategy backtesting with historical data

### User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-4.1 | As a trader, I want to run backtests on my strategies to see how they would have performed historically. | High |
| US-4.2 | As a trader, I want to see detailed backtest results including charts and statistics. | High |
| US-4.3 | As a trader, I want to compare multiple backtest results. | Medium |

### Task 4.1: Create Backtest Configuration Form

**File:** `client/src/pages/Backtesting.tsx`

**Form fields:**
- Strategy selection (dropdown)
- Date range (start/end date pickers)
- Initial capital (number input)
- Trading pair/symbol

**Acceptance Criteria:**
- [ ] Form validates all inputs
- [ ] Submit triggers backtest API call
- [ ] Progress indicator while running

---

### Task 4.2: Implement Backtest Execution

**Files:** `server/routes.ts`, `server/services/backtestEngine.ts`

**Backend logic:**
1. Accept backtest parameters
2. Create backtest record with "running" status
3. Simulate strategy against historical data
4. Calculate performance metrics
5. Update status to "completed" or "failed"

**Note:** Initial version can use mock historical data

**Acceptance Criteria:**
- [ ] Backtest creates proper result record
- [ ] Results include all required metrics
- [ ] Status transitions are logged

---

### Task 4.3: Enhanced Results Display

**File:** `client/src/components/dashboard/BacktestingTable.tsx`

**Enhancements:**
- Click row to view detailed results
- Equity curve chart for each backtest
- Trade-by-trade breakdown
- Comparison view for multiple backtests

**Acceptance Criteria:**
- [ ] Detail view shows comprehensive results
- [ ] Charts render correctly
- [ ] Compare mode works with 2+ backtests

---

### Definition of Done - Epic 4
- [ ] Traders can configure and run backtests
- [ ] Results display with detailed metrics
- [ ] Comparison feature works
- [ ] All backtest states (running/completed/failed) handled

---

## Epic 5: AI Trading Assistant Integration (P2)

**Goal:** Connect the chat interface to OpenAI for intelligent trading insights

### User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-5.1 | As a trader, I want to ask the AI about my portfolio performance and get intelligent analysis. | High |
| US-5.2 | As a trader, I want the AI to suggest strategy improvements based on my data. | High |
| US-5.3 | As a trader, I want the AI to explain market conditions and their impact on my strategies. | Medium |

### Task 5.1: Create AI Chat API Endpoint

**File:** `server/routes.ts`

**Endpoint:** `POST /api/chat`

**Request body:**
```typescript
{
  message: string;      // user's question
  context: {            // portfolio/strategy data
    portfolio: PortfolioMetrics;
    strategies: Strategy[];
    recentTrades: Trade[];
    marketData: MarketData[];
  }
}
```

**Implementation:**
- Use OpenAI integration (already installed)
- Build system prompt with trading context
- Stream response for better UX

**Acceptance Criteria:**
- [ ] Endpoint accepts message and context
- [ ] Returns AI-generated response
- [ ] Handles API errors gracefully

---

### Task 5.2: Build AI Prompt Engineering

**File:** `server/services/aiPrompts.ts`

**System prompt components:**
- **Role:** Trading analyst assistant
- **Context:** User's portfolio, strategies, recent trades
- **Capabilities:** Analysis, recommendations, explanations
- **Constraints:** No financial advice disclaimer

**Context formatting:**
- Summarize portfolio metrics
- List active strategies with performance
- Include recent trade activity
- Current market conditions

**Acceptance Criteria:**
- [ ] AI responses are contextually relevant
- [ ] Responses reference actual user data
- [ ] Appropriate disclaimers included

---

### Task 5.3: Update Chat Frontend

**File:** `client/src/pages/Chat.tsx`

**Changes:**
- Replace `simulateAIResponse` with API call
- Implement streaming response display
- Add retry logic for failed requests
- Show typing indicator during response

**Acceptance Criteria:**
- [ ] Chat uses real OpenAI API
- [ ] Responses stream in real-time
- [ ] Error states handled gracefully
- [ ] Context cards still display real data

---

### Definition of Done - Epic 5
- [ ] AI responds with actual OpenAI-generated content
- [ ] Responses are contextual to user's trading data
- [ ] Streaming provides smooth UX
- [ ] Error handling and retry logic in place

---

## Epic 6: Market Data Management (P3)

**Goal:** Enable market data display and management

### User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-6.1 | As a trader, I want to see current market prices for my watched instruments. | Medium |
| US-6.2 | As a trader, I want to add/remove instruments from my watchlist. | Medium |
| US-6.3 | As a trader, I want to see price charts for different timeframes. | Medium |

### Task 6.1: Implement Watchlist Management

**Changes needed:**
- Add watchlist to storage interface
- Create API endpoints for watchlist CRUD
- UI for adding/removing symbols

**Acceptance Criteria:**
- [ ] Users can add symbols to watchlist
- [ ] Users can remove symbols
- [ ] Watchlist persists between sessions

---

### Task 6.2: Enhance Market Chart Component

**File:** `client/src/components/dashboard/MarketChart.tsx`

**Enhancements:**
- Timeframe selector (1H, 4H, 1D, 1W)
- Symbol selector from watchlist
- Volume overlay
- Basic technical indicators (SMA, EMA)

**Acceptance Criteria:**
- [ ] Chart updates when timeframe changes
- [ ] Symbol selection works
- [ ] Indicators toggle on/off

---

### Definition of Done - Epic 6
- [ ] Watchlist fully functional
- [ ] Charts support multiple timeframes
- [ ] Technical indicators available

---

## Epic 7: Settings & Preferences (P3)

**Goal:** Allow users to configure and persist their preferences

### User Stories

| ID | Story | Priority |
|----|-------|----------|
| US-7.1 | As a trader, I want to save my dashboard preferences so they persist. | Medium |
| US-7.2 | As a trader, I want to configure default trading parameters. | Medium |

### Task 7.1: Implement Settings Persistence

**Backend:**
- Add settings schema
- Add `GET/PUT /api/settings` endpoints
- Add to storage interface

**Frontend:**
- Update Settings.tsx to fetch/save via API
- Add save button with loading state

**Acceptance Criteria:**
- [ ] Settings save to backend
- [ ] Settings load on app start
- [ ] Changes apply immediately

---

### Definition of Done - Epic 7
- [ ] Settings persist between sessions
- [ ] All preference categories work
- [ ] Default values applied on first load

---

## Epic 8: Real-time Data Feeds (P4 - Future)

**Goal:** Implement WebSocket connections for live market data

*Deferred to future release*

---

## Epic 9: User Authentication (P4 - Future)

**Goal:** Add user accounts and session management

*Deferred to future release*

---

## Sprint Planning Recommendation

### Sprint 1 (Weeks 1-2): Foundation
- Epic 1: Backend API Foundation (all tasks)

### Sprint 2 (Weeks 3-4): Core Trading
- Epic 2: Strategy Management
- Epic 3: Portfolio & Trade Management

### Sprint 3 (Weeks 5-6): Advanced Features
- Epic 4: Backtesting Engine
- Epic 5: AI Trading Assistant Integration

### Sprint 4 (Week 7): Polish
- Epic 6: Market Data Management
- Epic 7: Settings & Preferences
- Bug fixes and refinements

---

## Technical Dependencies

```
Epic 1 (Backend API)
    │
    ├──▶ Epic 2 (Strategies)
    │
    ├──▶ Epic 3 (Portfolio/Trades)
    │        │
    │        └──▶ Epic 4 (Backtesting)
    │
    ├──▶ Epic 5 (AI Chat)
    │
    ├──▶ Epic 6 (Markets)
    │
    └──▶ Epic 7 (Settings)
```

---

## Appendix: Data Flow Diagrams

### Current Data Flow (Mock Data)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React Page    │────▶│  TanStack Query  │────▶│ TradingService  │
│   (Overview)    │     │   (useQuery)     │     │  (static class) │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
        ▲                       │                         │
        │                       │ cache                   ▼
        │                       ▼                 ┌───────────────┐
        │               ┌──────────────┐          │   mockData.ts │
        └───────────────│  Component   │◀─────────│ (hardcoded)   │
         re-render      │    Props     │          └───────────────┘
                        └──────────────┘
```

### Target Data Flow (With Backend)

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React Page    │────▶│  TanStack Query  │────▶│   apiRequest    │
│   (Overview)    │     │   (useQuery)     │     │   (fetch)       │
└─────────────────┘     └──────────────────┘     └────────┬────────┘
        ▲                       │                         │
        │                       │ cache                   │ HTTP
        │                       ▼                         ▼
        │               ┌──────────────┐          ┌───────────────┐
        └───────────────│  Component   │          │  Express API  │
         re-render      │    Props     │          │  /api/...     │
                        └──────────────┘          └───────┬───────┘
                                                          │
                                                          ▼
                                                  ┌───────────────┐
                                                  │   IStorage    │
                                                  │ (MemStorage/  │
                                                  │  PostgreSQL)  │
                                                  └───────────────┘
```

### AI Chat Data Flow

```
┌─────────────┐                              ┌─────────────────────────┐
│  User Input │                              │     Context Queries     │
│   (Chat)    │                              │  (TanStack useQuery)    │
└──────┬──────┘                              └────────────┬────────────┘
       │                                                  │
       ▼                                                  ▼
┌──────────────────────────────────────────────────────────────────────┐
│                        Chat.tsx Component                            │
│  ┌────────────────┐    ┌──────────────────┐    ┌─────────────────┐  │
│  │ handleSend()   │───▶│ getContextSummary│───▶│  POST /api/chat │  │
│  │                │    │ - portfolio      │    │  (OpenAI call)  │  │
│  │                │    │ - strategies     │    │                  │  │
│  │                │    │ - trades         │    │                  │  │
│  │                │    │ - marketData     │    │                  │  │
│  └────────────────┘    └──────────────────┘    └────────┬────────┘  │
│                                                         │           │
│                        ┌────────────────────────────────┘           │
│                        ▼                                            │
│              ┌─────────────────┐                                    │
│              │  setMessages()  │──▶ Messages state updated          │
│              └─────────────────┘                                    │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Notes

- All estimates assume a team of 2-3 developers
- Sprint duration: 2 weeks
- This guide should be reviewed and adjusted based on team velocity
- Authentication and real-time features are intentionally deprioritized per stakeholder request
