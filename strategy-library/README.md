# Praxis Strategy Library

100 trading-strategy hypotheses — 80 established (documented in academic or practitioner literature) and 20 novel/original designs (marked **[NOVEL]**; where a novel design builds on documented components, the doc's Origin line credits the lineage honestly).

**These are hypotheses, not validated edges.** Every entry is Stage-0 input for the Praxis gate pipeline (`idea -> feasibility -> walk_forward -> monte_carlo -> incubation -> diversification_sizing -> live`): lock goals first, test on real engine data, count every trial, and expect most of these to be discarded — that is the pipeline working. See `.agents/strategy-research-agent.md` for the research discipline and `STRATEGY_FACTORY_IMPLEMENTATION_PLAN.md` for the methodology.

Each document contains: a summary (mechanism and who loses), possible instruments, entry rules, exit rules, and pseudocode.

| # | Strategy | Category |
|---|---|---|
| [001](001-donchian-channel-breakout.md) | Donchian Channel Breakout (Turtle-style) | Trend following |
| [002](002-dual-moving-average-crossover.md) | Dual Moving Average Crossover with Trend Filter | Trend following |
| [003](003-triple-moving-average.md) | Triple Moving Average Alignment | Trend following |
| [004](004-adx-filtered-trend-pullback.md) | ADX-Filtered Trend Pullback Entry | Trend following |
| [005](005-macd-trend-momentum.md) | MACD Trend Momentum | Trend following |
| [006](006-keltner-channel-breakout.md) | Keltner Channel Breakout | Trend following / volatility breakout |
| [007](007-52-week-high-breakout.md) | 52-Week High Breakout | Trend following / behavioral |
| [008](008-parabolic-sar-rider.md) | Parabolic SAR Trend Rider | Trend following |
| [009](009-supertrend-atr-following.md) | Supertrend ATR Following | Trend following |
| [010](010-linear-regression-slope-trend.md) | Linear Regression Slope Trend | Trend following |
| [011](011-fractal-breakout.md) | Williams Fractal Breakout | Trend following / swing structure |
| [012](012-weekly-trend-daily-entry.md) | Weekly Trend, Daily Entry (Timeframe Stack) | Trend following / multi-timeframe |
| [013](013-cross-sectional-momentum-12-1.md) | Cross-Sectional Momentum (12-1 Relative Strength) | Momentum / rotation |
| [014](014-sector-rotation-momentum.md) | Sector Rotation Momentum (ETF) | Momentum / rotation |
| [015](015-dual-momentum.md) | Dual Momentum (Absolute + Relative) | Momentum / asset allocation |
| [016](016-time-series-momentum.md) | Time-Series Momentum (TSMOM) | Momentum / managed futures style |
| [017](017-52-week-high-proximity-rotation.md) | 52-Week-High Proximity Rotation | Momentum / behavioral |
| [018](018-post-earnings-announcement-drift.md) | Post-Earnings Announcement Drift (PEAD) | Momentum / event-driven |
| [019](019-residual-momentum.md) | Residual (Idiosyncratic) Momentum | Momentum / factor-neutral |
| [020](020-volatility-scaled-momentum.md) | Volatility-Scaled Momentum | Momentum / risk-managed |
| [021](021-industry-momentum.md) | Industry Momentum | Momentum / rotation |
| [022](022-momentum-acceleration.md) | Momentum Acceleration (Momentum-of-Momentum) | Momentum |
| [023](023-rsi2-pullback.md) | RSI(2) Pullback in an Uptrend | Mean reversion |
| [024](024-bollinger-band-reversion.md) | Bollinger Band Reversion | Mean reversion |
| [025](025-double-seven.md) | Double 7's | Mean reversion |
| [026](026-three-day-low-in-uptrend.md) | Three Lower Closes in an Uptrend | Mean reversion |
| [027](027-internal-bar-strength.md) | Internal Bar Strength (IBS) Reversion | Mean reversion |
| [028](028-gap-down-reversion.md) | Gap-Down Reversion in an Uptrend | Mean reversion / overnight |
| [029](029-zscore-distance-reversion.md) | Z-Score Distance-from-Mean Reversion | Mean reversion / statistical |
| [030](030-vix-filtered-reversion.md) | VIX-Spike Equity Reversion | Mean reversion / cross-asset filter |
| [031](031-keltner-lower-band-bounce.md) | Keltner Lower-Band Bounce | Mean reversion |
| [032](032-percent-b-reversion.md) | %B Oscillator Reversion | Mean reversion |
| [033](033-overnight-reversal-big-down-day.md) | Overnight Hold After a Big Down Day | Mean reversion / overnight effect |
| [034](034-weekly-rsi-reversion.md) | Weekly Oversold Reversion in a Bull Market | Mean reversion / position timeframe |
| [035](035-opening-range-breakout.md) | Opening Range Breakout (ORB) | Intraday breakout |
| [036](036-volatility-contraction-pattern.md) | Volatility Contraction Pattern (VCP) Breakout | Breakout / swing |
| [037](037-bollinger-squeeze-breakout.md) | Bollinger Squeeze Breakout | Volatility breakout |
| [038](038-nr7-breakout.md) | NR7 (Narrowest Range 7) Breakout | Volatility breakout / pattern day trade |
| [039](039-inside-bar-breakout.md) | Inside Bar Breakout | Breakout / pattern |
| [040](040-atr-expansion-breakout.md) | ATR Expansion Day Breakout | Volatility breakout |
| [041](041-consolidation-volume-dryup.md) | Consolidation Breakout with Volume Dry-Up | Breakout / accumulation |
| [042](042-high-tight-flag.md) | High-Tight Flag Continuation | Breakout / momentum pattern |
| [043](043-range-compression-expansion-day.md) | Multi-Day Range Compression Expansion | Volatility breakout |
| [044](044-london-breakout.md) | London Session Breakout (FX) | Intraday breakout / session-based |
| [045](045-turn-of-month.md) | Turn-of-Month Equity Effect | Calendar / seasonality |
| [046](046-seasonal-strength-window.md) | Year-End Seasonal Strength Window | Calendar / seasonality |
| [047](047-halloween-effect.md) | Halloween Effect (Sell in May) | Calendar / seasonality |
| [048](048-monday-reversal.md) | Weekend Weakness / Monday Reversal | Calendar / short-term reversion |
| [049](049-pre-holiday-drift.md) | Pre-Holiday Drift | Calendar / seasonality |
| [050](050-quarter-end-window-dressing.md) | Quarter-End Window Dressing Fade/Ride | Calendar / institutional flow |
| [051](051-fomc-drift.md) | FOMC Pre-Announcement Drift | Calendar / macro event |
| [052](052-commodity-seasonality.md) | Commodity Calendar Seasonality | Calendar / commodity |
| [053](053-cointegration-pairs.md) | Cointegration Pairs Trading | Pairs / statistical arbitrage |
| [054](054-sector-pair-spread.md) | Sector ETF Pair Spread Reversion | Pairs / relative value |
| [055](055-gold-silver-ratio.md) | Gold/Silver Ratio Reversion | Pairs / commodity relative value |
| [056](056-stock-vs-sector-reversion.md) | Single Stock vs Sector Relative Reversion | Pairs / relative value |
| [057](057-wti-brent-spread.md) | WTI-Brent Spread Reversion | Pairs / commodity spread |
| [058](058-bond-equity-ratio-rotation.md) | Stock/Bond Ratio Trend Rotation | Relative value / macro rotation |
| [059](059-covered-call.md) | Systematic Covered Calls (Buy-Write) | Options / volatility premium |
| [060](060-cash-secured-puts.md) | Systematic Cash-Secured Put Selling | Options / volatility premium |
| [061](061-vix-contango-short-vol.md) | VIX Term-Structure Contango Harvest | Volatility premium / futures curve |
| [062](062-iron-condor-premium.md) | Defined-Risk Iron Condor Premium | Options / volatility premium |
| [063](063-vix-spike-fade-etp.md) | VIX Spike Fade via Options | Volatility mean reversion |
| [064](064-calendar-spread-iv.md) | Elevated Front-Month Calendar Spread | Options / term structure |
| [065](065-wheel-strategy.md) | The Wheel (CSP -> Assignment -> Covered Call Cycle) | Options / premium income cycle |
| [066](066-collar-carry.md) | Protective Collar Carry | Options / hedged equity |
| [067](067-put-ratio-repair.md) | Volatility-Crush Earnings Iron Fly | Options / event volatility |
| [068](068-fx-carry.md) | FX Carry Basket | Carry / macro |
| [069](069-futures-roll-yield.md) | Commodity Roll-Yield (Backwardation) Harvest | Carry / commodity curve |
| [070](070-bond-curve-carry.md) | Bond Carry & Roll-Down | Carry / rates |
| [071](071-risk-parity-lite.md) | Risk Parity Lite (Volatility-Weighted Multi-Asset) | Asset allocation / risk balancing |
| [072](072-bond-momentum-rotation.md) | Treasury Duration Momentum Rotation | Momentum / fixed income |
| [073](073-gtaa-10-month.md) | Global Tactical Asset Allocation (10-Month SMA) | Trend / asset allocation |
| [074](074-gap-and-go.md) | Gap-and-Go Continuation | Intraday momentum / event |
| [075](075-first-hour-range-break.md) | First-Hour Range Break | Intraday breakout |
| [076](076-vwap-reversion.md) | Intraday VWAP Reversion | Intraday mean reversion |
| [077](077-last-hour-momentum.md) | Last-Hour Momentum (Power Hour) | Intraday momentum / flow |
| [078](078-overnight-drift.md) | Overnight Drift (Close-to-Open Premium) | Session anomaly |
| [079](079-pivot-point-bounce.md) | Floor-Trader Pivot Bounce | Intraday support/resistance |
| [080](080-donchian-pullback-hybrid.md) | Breakout-Pullback Hybrid (Buy the First Retest) | Trend / entry-timing hybrid |
| [081](081-gap-budget-exhaustion-fade.md) | Gap Budget Exhaustion Fade **[NOVEL]** | Mean reversion / overnight flow |
| [082](082-nested-squeeze-chain.md) | Nested Squeeze Chain **[NOVEL]** | Volatility breakout / multi-timeframe |
| [083](083-failed-breakout-harvest.md) | Failed-Breakout Harvest **[NOVEL]** | Contrarian / structure |
| [084](084-correlation-dislocation-snapback.md) | Correlation Dislocation Snapback **[NOVEL]** | Statistical / relative value |
| [085](085-round-number-liquidity-trap.md) | Round-Number Liquidity Trap **[NOVEL]** | Behavioral / microstructure |
| [086](086-vol-of-vol-regime-gate.md) | Vol-of-Vol Regime Gate **[NOVEL]** | Meta / regime filter as strategy |
| [087](087-crypto-weekend-gap-reversion.md) | Crypto Weekend Dislocation Reversion **[NOVEL]** | Session structure / crypto |
| [088](088-implied-move-overshoot-pead.md) | Implied-Move Overshoot PEAD **[NOVEL]** | Event momentum / options-informed |
| [089](089-streak-survival-ladder.md) | Streak Survival Ladder **[NOVEL]** | Mean reversion / statistical sizing |
| [090](090-liquidity-vacuum-fade.md) | Liquidity Vacuum Fade **[NOVEL]** | Microstructure / mean reversion |
| [091](091-cross-asset-stress-divergence.md) | Cross-Asset Stress Divergence Buy **[NOVEL]** | Mean reversion / cross-asset confirmation |
| [092](092-institutional-clock-momentum.md) | Institutional Clock Momentum **[NOVEL]** | Intraday periodicity |
| [093](093-absorption-failure-reversal.md) | Level Absorption Failure Reversal **[NOVEL]** | Price structure / supply-demand |
| [094](094-post-event-vol-mispricing.md) | Scheduled-Event Volatility Aftermath **[NOVEL]** | Volatility / macro event |
| [095](095-dividend-runup-recycler.md) | Dividend Run-Up Recycler **[NOVEL]** | Calendar / flow |
| [096](096-triple-gate-short-vol.md) | Triple-Gate Short-Vol Carry **[NOVEL]** | Volatility premium / regime-gated |
| [097](097-macro-announcement-premium.md) | Macro Announcement Premium Harvester **[NOVEL]** | Calendar / event risk premium |
| [098](098-funding-rate-contrarian.md) | Crypto Funding-Rate Contrarian **[NOVEL]** | Sentiment / positioning extreme (crypto) |
| [099](099-volatility-lifecycle-migration.md) | Volatility Lifecycle Migration **[NOVEL]** | Volatility regime / trend timing |
| [100](100-anchored-vwap-reclaim.md) | Capitulation-Anchored VWAP Reclaim **[NOVEL]** | Behavioral / anchored volume structure |
