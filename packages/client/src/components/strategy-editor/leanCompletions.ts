import type { Monaco } from "@monaco-editor/react";

export function registerLeanCompletions(monaco: Monaco) {
  monaco.languages.registerCompletionItemProvider("python", {
    triggerCharacters: [".", "s", "Q"],
    provideCompletionItems: (model, position) => {
      const wordInfo = model.getWordUntilPosition(position);
      const range = {
        startLineNumber: position.lineNumber,
        endLineNumber: position.lineNumber,
        startColumn: wordInfo.startColumn,
        endColumn: wordInfo.endColumn,
      };

      const textUntilPosition = model.getValueInRange({
        startLineNumber: 1,
        startColumn: 1,
        endLineNumber: position.lineNumber,
        endColumn: position.column,
      });

      const isSelfContext = textUntilPosition.endsWith("self.");
      const isNewLine = /^\s*$/.test(textUntilPosition.split("\n").pop() || "");

      const createSnippet = (
        label: string,
        insertText: string,
        detail: string,
        documentation: string
      ) => ({
        label,
        kind: monaco.languages.CompletionItemKind.Method,
        insertText,
        insertTextRules:
          monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
        detail,
        documentation,
        range,
      });

      const selfMethods = [
        createSnippet(
          "set_start_date",
          "set_start_date(${1:2022}, ${2:1}, ${3:1})",
          "set_start_date(year, month, day)",
          "Sets the algorithm start date for backtesting."
        ),
        createSnippet(
          "set_end_date",
          "set_end_date(${1:2023}, ${2:12}, ${3:31})",
          "set_end_date(year, month, day)",
          "Sets the algorithm end date for backtesting."
        ),
        createSnippet(
          "set_cash",
          "set_cash(${1:100000})",
          "set_cash(amount)",
          "Sets the initial portfolio cash balance."
        ),
        createSnippet(
          "add_equity",
          'add_equity("${1:SPY}", Resolution.${2|DAILY,HOUR,MINUTE|})',
          "add_equity(ticker, resolution)",
          "Adds an equity security to the algorithm."
        ),
        createSnippet(
          "add_crypto",
          'add_crypto("${1:BTCUSD}", Resolution.${2|HOUR,DAILY,MINUTE|})',
          "add_crypto(ticker, resolution)",
          "Adds a cryptocurrency security to the algorithm."
        ),
        createSnippet(
          "add_forex",
          'add_forex("${1:EURUSD}", Resolution.${2|DAILY,HOUR|})',
          "add_forex(ticker, resolution)",
          "Adds a forex currency pair to the algorithm."
        ),
        createSnippet(
          "set_holdings",
          "set_holdings(${1:symbol}, ${2:1.0})",
          "set_holdings(symbol, percentage)",
          "Sets the portfolio allocation for a symbol as a percentage (0.0 to 1.0)."
        ),
        createSnippet(
          "liquidate",
          "liquidate(${1:symbol})",
          "liquidate(symbol?)",
          "Liquidates holdings. If no symbol provided, liquidates all positions."
        ),
        createSnippet(
          "set_warm_up",
          "set_warm_up(${1:20})",
          "set_warm_up(period)",
          "Sets the warmup period for indicators."
        ),
        createSnippet(
          "sma",
          'sma(${1:symbol}, ${2:20}, Resolution.${3|DAILY,HOUR,MINUTE|})',
          "sma(symbol, period, resolution)",
          "Creates a Simple Moving Average indicator."
        ),
        createSnippet(
          "ema",
          'ema(${1:symbol}, ${2:20}, Resolution.${3|DAILY,HOUR,MINUTE|})',
          "ema(symbol, period, resolution)",
          "Creates an Exponential Moving Average indicator."
        ),
        createSnippet(
          "rsi",
          "rsi(${1:symbol}, ${2:14}, MovingAverageType.SIMPLE, Resolution.${3|DAILY,HOUR|})",
          "rsi(symbol, period, type, resolution)",
          "Creates a Relative Strength Index indicator."
        ),
        createSnippet(
          "macd",
          "macd(${1:symbol}, ${2:12}, ${3:26}, ${4:9}, MovingAverageType.EXPONENTIAL, Resolution.${5|DAILY,HOUR|})",
          "macd(symbol, fast, slow, signal, type, resolution)",
          "Creates a MACD indicator."
        ),
        createSnippet(
          "bb",
          "bb(${1:symbol}, ${2:20}, ${3:2}, MovingAverageType.SIMPLE, Resolution.${4|DAILY,HOUR|})",
          "bb(symbol, period, stddev, type, resolution)",
          "Creates a Bollinger Bands indicator."
        ),
        createSnippet(
          "atr",
          "atr(${1:symbol}, ${2:14}, MovingAverageType.SIMPLE, Resolution.${3|DAILY,HOUR|})",
          "atr(symbol, period, type, resolution)",
          "Creates an Average True Range indicator."
        ),
        createSnippet(
          "max",
          'max(${1:symbol}, ${2:20}, Resolution.${3|DAILY,HOUR|})',
          "max(symbol, period, resolution)",
          "Creates a Maximum indicator tracking the highest value over a period."
        ),
        createSnippet(
          "min",
          'min(${1:symbol}, ${2:20}, Resolution.${3|DAILY,HOUR|})',
          "min(symbol, period, resolution)",
          "Creates a Minimum indicator tracking the lowest value over a period."
        ),
        createSnippet(
          "history",
          "history(${1:symbol}, ${2:30}, Resolution.${3|DAILY,HOUR,MINUTE|})",
          "history(symbol, periods, resolution)",
          "Requests historical data for the specified symbol."
        ),
        createSnippet(
          "log",
          'log(f"${1:message}")',
          "log(message)",
          "Logs a message to the algorithm output."
        ),
        createSnippet(
          "plot",
          'plot("${1:Chart}", "${2:Series}", ${3:value})',
          "plot(chart, series, value)",
          "Plots a value to a custom chart in the results."
        ),
        createSnippet(
          "set_benchmark",
          'set_benchmark("${1:SPY}")',
          "set_benchmark(symbol)",
          "Sets the benchmark security for performance comparison."
        ),
        createSnippet(
          "market_order",
          "market_order(${1:symbol}, ${2:quantity})",
          "market_order(symbol, quantity)",
          "Places a market order."
        ),
        createSnippet(
          "limit_order",
          "limit_order(${1:symbol}, ${2:quantity}, ${3:price})",
          "limit_order(symbol, quantity, price)",
          "Places a limit order."
        ),
        createSnippet(
          "stop_market_order",
          "stop_market_order(${1:symbol}, ${2:quantity}, ${3:stopPrice})",
          "stop_market_order(symbol, quantity, stopPrice)",
          "Places a stop market order."
        ),
        createSnippet(
          "is_warming_up",
          "is_warming_up",
          "bool: is_warming_up",
          "Returns True if the algorithm is in the warmup period."
        ),
        createSnippet(
          "portfolio",
          "portfolio[${1:symbol}]",
          "portfolio[symbol]",
          "Accesses the portfolio holdings for a symbol."
        ),
        createSnippet(
          "securities",
          "securities[${1:symbol}]",
          "securities[symbol]",
          "Accesses the security object for a symbol."
        ),
        createSnippet(
          "schedule.on",
          "schedule.on(\n    self.date_rules.${1|month_start(),week_start(),every_day()|},\n    self.time_rules.after_market_open(\"${2:SPY}\", ${3:30}),\n    self.${4:rebalance}\n)",
          "schedule.on(dateRule, timeRule, action)",
          "Schedules a function to be called at specified times."
        ),
      ];

      const topLevelSnippets = [
        {
          label: "QCAlgorithm class",
          kind: monaco.languages.CompletionItemKind.Class,
          insertText: [
            "from AlgorithmImports import *",
            "",
            "class ${1:MyStrategy}(QCAlgorithm):",
            '    """${2:Strategy description}"""',
            "",
            "    def initialize(self):",
            "        self.set_start_date(${3:2022}, ${4:1}, ${5:1})",
            "        self.set_end_date(${6:2023}, ${7:12}, ${8:31})",
            "        self.set_cash(${9:100000})",
            "        self.symbol = self.add_equity(\"${10:SPY}\", Resolution.DAILY).symbol",
            "        self.set_warm_up(${11:20})",
            "",
            "    def on_data(self, data):",
            "        if self.is_warming_up:",
            "            return",
            "        $0",
          ].join("\n"),
          insertTextRules:
            monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          detail: "QCAlgorithm template",
          documentation:
            "Creates a complete LEAN algorithm class with initialize and on_data methods.",
          range,
        },
      ];

      if (isSelfContext) {
        return { suggestions: selfMethods };
      }

      if (isNewLine) {
        return { suggestions: [...topLevelSnippets, ...selfMethods] };
      }

      return { suggestions: [...topLevelSnippets, ...selfMethods] };
    },
  });

  monaco.languages.registerHoverProvider("python", {
    provideHover: (model, position) => {
      const word = model.getWordAtPosition(position);
      if (!word) return null;

      const hoverDocs: Record<string, string> = {
        QCAlgorithm:
          "Base class for all QuantConnect LEAN trading algorithms. All strategies must inherit from this class.",
        Resolution:
          "Enum for data resolution: Resolution.TICK, Resolution.SECOND, Resolution.MINUTE, Resolution.HOUR, Resolution.DAILY",
        MovingAverageType:
          "Enum for moving average types: SIMPLE, EXPONENTIAL, WILDERS, HULL, etc.",
        AlgorithmImports:
          "LEAN algorithm imports module containing all necessary classes and enums.",
        initialize:
          "Called once at algorithm start. Set up securities, indicators, and scheduled events here.",
        on_data: "Called on each new data point. Contains main trading logic.",
      };

      const doc = hoverDocs[word.word];
      if (doc) {
        return {
          contents: [{ value: `**${word.word}** — ${doc}` }],
        };
      }

      return null;
    },
  });
}
