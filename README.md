# StrategyVisualizer (Praxis)

A comprehensive trading analytics and backtesting platform for algorithmic trading strategy development, historical analysis, and portfolio visualization.

## 🎯 What is StrategyVisualizer?

StrategyVisualizer, also known as **Praxis**, is a full-stack trading analytics dashboard designed for:
- **Strategy Development**: Create and manage momentum, mean reversion, trend-following, and arbitrage strategies
- **Backtesting**: Test strategies with Monte Carlo simulation and comprehensive performance metrics
- **Portfolio Analytics**: Track portfolio performance with detailed metrics (Sharpe ratio, drawdown, win rate, etc.)
- **Risk-Free Testing**: Simulate trading without risking real capital
- **AI Assistant**: Get insights and recommendations from GPT-5 powered chat

## 📊 Key Features

### Dashboard & Analytics
- Real-time portfolio metrics dashboard
- Performance charts (portfolio vs benchmark)
- Market data visualization for BTC, ETH, SOL, ADA, XRP
- Trade history tracking
- Comprehensive KPI monitoring

### Strategy Management
- Full CRUD operations for trading strategies
- Support for 4 strategy types: Momentum, Mean Reversion, Trend Following, Arbitrage
- Performance tracking per strategy
- Strategy comparison tools

### Backtesting Engine
- Monte Carlo simulation for robust testing
- Configurable parameters (date range, initial capital, symbols)
- Comprehensive metrics: Total Return, Sharpe Ratio, Max Drawdown, Win Rate
- Side-by-side backtest comparison

### Portfolio Management
- Manual trade logging
- Automatic P&L calculation
- Portfolio metrics tracking
- Risk analytics (volatility, beta)

### AI Trading Assistant
- GPT-5 powered conversational AI
- Portfolio analysis and insights
- Strategy recommendations
- Market analysis
- Risk assessment

## 🛠️ Technology Stack

### Frontend
- React 18 + TypeScript
- Vite (build tool)
- Wouter (routing)
- TanStack Query (state management)
- Shadcn/ui + Radix UI (components)
- Tailwind CSS (styling)
- Recharts (data visualization)

### Backend
- Express.js + TypeScript
- Drizzle ORM
- PostgreSQL (Neon serverless) - optional
- In-memory storage (default)
- OpenAI API integration
- CoinGecko API (market data)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- (Optional) PostgreSQL database

### Installation

```bash
# Clone the repository
git clone https://github.com/TimCodes/StrategyVisualizer.git
cd StrategyVisualizer

# Install dependencies
npm install

# (Optional) Configure environment variables
# Copy .env.example to .env and add your API keys

# Start development server
npm run dev
```

The application will be available at `http://localhost:5173` (frontend) and `http://localhost:3000` (backend API).

## 📚 Documentation

- **[APPLICATION_ANALYSIS.md](./APPLICATION_ANALYSIS.md)** - Comprehensive application architecture and feature documentation
- **[IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md)** - Implementation details and development guide
- **[REPOSITORY_COMPARISON.md](./REPOSITORY_COMPARISON.md)** - Detailed comparison with TradeWithAI platform
- **[COMPARISON_SUMMARY.md](./COMPARISON_SUMMARY.md)** - Quick reference comparison summary

## 🔄 How It Compares to TradeWithAI

StrategyVisualizer and [TradeWithAI](https://github.com/TimCodes/TradeWithAI-) serve **complementary purposes**:

| Feature | StrategyVisualizer | TradeWithAI |
|---------|-------------------|-------------|
| **Purpose** | Strategy development & testing | Live trading automation |
| **Trading** | Simulation only | Live execution (Kraken) |
| **Backtesting** | ✅ Advanced (Monte Carlo) | ❌ Limited |
| **AI Integration** | GPT-5 (advisory) | Multi-LLM (decision-making) |
| **Risk** | None (simulation) | High (real money) |
| **Best For** | Strategy research | Production trading |

**Recommended Workflow:**
1. Develop strategies in **StrategyVisualizer** (risk-free)
2. Validate with comprehensive backtesting
3. Deploy to **TradeWithAI** for live execution

See [REPOSITORY_COMPARISON.md](./REPOSITORY_COMPARISON.md) for detailed analysis.

## 📋 Available Scripts

```bash
npm run dev      # Start development server (frontend + backend)
npm run build    # Build for production
npm run start    # Start production server
npm run check    # TypeScript type checking
npm run db:push  # Push database schema changes
```

## 🏗️ Project Structure

```
StrategyVisualizer/
├── client/              # React frontend
│   └── src/
│       ├── components/  # UI components
│       ├── pages/      # Page components
│       ├── services/   # API client
│       └── lib/        # Utilities
├── server/             # Express backend
│   ├── index.ts       # Server entry point
│   ├── routes.ts      # API routes
│   ├── storage.ts     # Data layer
│   └── db.ts          # Database connection
├── shared/            # Shared types
│   └── schema.ts      # Type definitions
└── package.json
```

## 🎯 Use Cases

### Perfect For:
- ✅ Learning algorithmic trading
- ✅ Developing and testing trading strategies
- ✅ Backtesting strategies before live deployment
- ✅ Portfolio performance tracking
- ✅ Risk analysis and strategy optimization
- ✅ Educational purposes

### Not Designed For:
- ❌ Live trading execution (use TradeWithAI instead)
- ❌ Multi-user organizations
- ❌ Production trading operations

## 🔒 Security Note

This application is designed for:
- Personal use and education
- Strategy development and testing
- Simulation and analysis

For production trading with real capital, consider using [TradeWithAI](https://github.com/TimCodes/TradeWithAI-) which includes:
- Live exchange integration
- Production-grade security (JWT, audit logs)
- Risk management automation
- Multi-user support

## 📊 Features Roadmap

Potential enhancements (see [REPOSITORY_COMPARISON.md](./REPOSITORY_COMPARISON.md) for details):
- [ ] Paper trading mode with live data
- [ ] Multi-user authentication
- [ ] WebSocket for real-time updates
- [ ] Multi-LLM support (Claude, Gemini)
- [ ] Exchange API integration for paper trading
- [ ] Advanced strategy builder UI
- [ ] Strategy versioning and A/B testing

## 🤝 Contributing

This is a personal project by [TimCodes](https://github.com/TimCodes). Feel free to fork and modify for your own use.

## ⚠️ Disclaimer

This software is for educational and research purposes only. Past performance does not guarantee future results. The backtesting results are simulations and may not reflect real trading conditions. Always do your own research and consider consulting with a financial advisor before making trading decisions.

## 📄 License

MIT License

---

**Related Projects:**
- [TradeWithAI](https://github.com/TimCodes/TradeWithAI-) - AI-powered autonomous trading platform for live execution

**For Questions or Issues:**
- Check the documentation files listed above
- Review the [comparison analysis](./REPOSITORY_COMPARISON.md) to understand how this fits in your workflow
- Explore the codebase and customize to your needs
