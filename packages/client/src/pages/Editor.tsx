import { StrategyEditor } from "@/components/strategy-editor/StrategyEditor";

export default function EditorPage() {
  return (
    <main className="flex-1 flex flex-col overflow-hidden h-screen">
      <div className="border-b border-border px-6 py-4 flex-shrink-0 bg-surface">
        <h1 className="text-xl font-bold text-text-primary">Strategy Editor</h1>
        <p className="text-sm text-text-secondary mt-0.5">
          Write, backtest, and refine LEAN Python trading strategies with AI assistance
        </p>
      </div>
      <div className="flex-1 overflow-hidden">
        <StrategyEditor />
      </div>
    </main>
  );
}
