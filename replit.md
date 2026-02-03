# Praxis - Trading Dashboard Application

## Overview

Praxis is a comprehensive trading dashboard application built for algorithmic trading strategy management and analysis. The platform provides real-time market data visualization, portfolio analytics, strategy backtesting capabilities, and trade execution monitoring. The application uses a modern full-stack architecture with React frontend, Express backend, and PostgreSQL database integration through Drizzle ORM.

## User Preferences

Preferred communication style: Simple, everyday language. Direct and focused responses without promotional language or selling.

## Recent Changes

- **February 3, 2026**: Created comparative analysis document (`TradeWithAI_vs_Praxis_Analysis.md`) comparing Praxis with TradeWithAI GitHub repository
- **February 3, 2026**: Created implementation plan (`IMPLEMENTATION_PLAN.md`) for adding TradeWithAI features:
  - Multi-LLM Integration (Claude, Gemini, GPT-5)
  - WebSocket Real-Time Communication
  - LLM Arena for model comparison
  - Trade Signal Parsing
  - Risk Management System

## Planned Enhancements

The following features are planned based on the TradeWithAI integration analysis:
- **Multi-LLM Support**: Provider abstraction layer for OpenAI, Anthropic (Claude), and Google (Gemini)
- **WebSocket Layer**: Real-time updates for market data, portfolio changes, and LLM streaming
- **LLM Arena**: Side-by-side AI model comparison interface
- **Signal Parsing**: NLP extraction of buy/sell signals from AI responses
- **Risk Management**: Position limits, stop-loss automation, drawdown monitoring

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
- **Trades**: Individual trade executions with P&L tracking
- **Backtest Results**: Historical strategy performance analysis
- **Portfolio Metrics**: Aggregate performance and risk metrics
- **Chat Messages**: AI assistant conversations with contextual trading data

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