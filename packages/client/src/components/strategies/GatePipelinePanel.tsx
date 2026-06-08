import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Activity, FlaskConical, Clock, TrendingUp, AlertTriangle,
  ChevronDown, ChevronUp, CheckCircle2, XCircle, HelpCircle,
  Play, Plus, RefreshCw, Database
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { GateResult } from "@shared/schema";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";

/** Must match DD_BLOWOUT_FACTOR in packages/server/services/gates.ts */
const DD_BLOWOUT_FACTOR = 1.5;

interface Props {
  strategyId: string;
}

type Verdict = "pass" | "fail" | "cannot_evaluate";

function VerdictBadge({ verdict }: { verdict: Verdict }) {
  if (verdict === "pass") {
    return (
      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Pass
      </Badge>
    );
  }
  if (verdict === "fail") {
    return (
      <Badge className="bg-red-500/15 text-red-400 border-red-500/30 gap-1">
        <XCircle className="h-3 w-3" />
        Fail
      </Badge>
    );
  }
  return (
    <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/30 gap-1">
      <HelpCircle className="h-3 w-3" />
      Cannot Evaluate
    </Badge>
  );
}

function DSRBar({ dsr, notValid }: { dsr?: number | null; notValid?: boolean }) {
  if (notValid || dsr == null) {
    return <span className="text-xs text-text-secondary italic">—</span>;
  }
  const pct = Math.round(dsr * 100);
  const color = dsr > 0.95 ? "bg-emerald-500" : dsr > 0.75 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-surface-raised rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-text-primary font-medium w-10 text-right">{pct}%</span>
    </div>
  );
}

function MonteCarloMetricsRow({ metrics }: { metrics: any }) {
  if (!metrics) return null;
  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      <div className="bg-surface-raised rounded p-2 text-center">
        <div className="text-xs text-text-secondary">Med Ret/DD</div>
        <div className="text-sm font-semibold text-text-primary">
          {metrics.medianRetDDRatio?.toFixed(2) ?? "—"}
        </div>
      </div>
      <div className="bg-surface-raised rounded p-2 text-center">
        <div className="text-xs text-text-secondary">Risk of Ruin</div>
        <div className="text-sm font-semibold text-text-primary">
          {metrics.riskOfRuin != null ? `${(metrics.riskOfRuin * 100).toFixed(1)}%` : "—"}
        </div>
      </div>
      <div className="bg-surface-raised rounded p-2 text-center">
        <div className="text-xs text-text-secondary">Med Drawdown</div>
        <div className="text-sm font-semibold text-text-primary">
          {metrics.medianMaxDD != null ? `${(metrics.medianMaxDD * 100).toFixed(1)}%` : "—"}
        </div>
      </div>
    </div>
  );
}

function IncubationCountdown({ strategy }: { strategy: any }) {
  if (!strategy?.incubationStartedAt) return null;
  const started = new Date(strategy.incubationStartedAt).getTime();
  const required = (strategy.requiredDays ?? 90) * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - started;
  const remaining = Math.max(0, required - elapsed);
  const elapsedDays = Math.floor(elapsed / (24 * 60 * 60 * 1000));
  const remainingDays = Math.ceil(remaining / (24 * 60 * 60 * 1000));
  const pct = Math.min(100, Math.round((elapsed / required) * 100));
  const complete = remaining === 0;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex justify-between text-xs text-text-secondary">
        <span>{elapsedDays}d elapsed</span>
        <span>{complete ? "Period complete" : `${remainingDays}d remaining`}</span>
      </div>
      <div className="h-1.5 bg-surface-raised rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${complete ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="text-xs text-text-secondary">
        {strategy.incubationObservations?.length ?? 0} observation{(strategy.incubationObservations?.length ?? 0) !== 1 ? "s" : ""} logged
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
//  Main panel
// ──────────────────────────────────────────────────────────

export default function GatePipelinePanel({ strategyId }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [mcExpanded, setMcExpanded] = useState(false);
  const [wfExpanded, setWfExpanded] = useState(false);
  const [incubExpanded, setIncubExpanded] = useState(false);
  const [incubDays, setIncubDays] = useState("90");
  const [obsReturn, setObsReturn] = useState("");
  const [obsDrawdown, setObsDrawdown] = useState("");
  const [obsSource, setObsSource] = useState<"manual" | "paper" | "live">("manual");
  const [obsNote, setObsNote] = useState("");
  const [obsDate, setObsDate] = useState(new Date().toISOString().split("T")[0]);

  // fetch strategy for incubation state
  const { data: strategyData } = useQuery<any>({
    queryKey: ["/api/strategies", strategyId],
    queryFn: () => fetch(`/api/strategies/${strategyId}`).then(r => r.json()),
    enabled: open,
  });

  // fetch gate results
  const { data: gateResults = [], isLoading } = useQuery<GateResult[]>({
    queryKey: ["/api/strategies", strategyId, "gate-results"],
    queryFn: () => fetch(`/api/strategies/${strategyId}/gate-results`).then(r => r.json()),
    enabled: open,
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ["/api/strategies"] });
    qc.invalidateQueries({ queryKey: ["/api/strategies", strategyId, "gate-results"] });
  };

  // latest result per gate
  const latestFor = (gate: string) => gateResults.find(r => r.gate === gate);

  // ─── Monte Carlo mutation ───────────────────────────────

  const mcMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/strategies/${strategyId}/gates/monte-carlo`, {
        backtest: {
          totalReturn: 0.15,
          sharpeRatio: 1.2,
          maxDrawdown: 0.08,
          winRate: 0.6,
          totalTrades: 20,
          equityCurve: Array.from({ length: 30 }, (_, i) => ({
            date: `2024-${String(Math.floor(i / 30) + 1).padStart(2, "0")}-${String((i % 30) + 1).padStart(2, "0")}`,
            value: 100 * Math.exp(i * 0.005 + (Math.random() - 0.5) * 0.02),
          })),
          dataSource: "simulated",
        },
      }),
    onSuccess: () => { toast({ title: "Monte Carlo complete" }); invalidateAll(); },
    onError: (e: any) => toast({ title: "Monte Carlo failed", description: e.message, variant: "destructive" }),
  });

  // ─── Walk-forward mutation ──────────────────────────────

  const wfMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/strategies/${strategyId}/gates/walk-forward`, {}),
    onSuccess: () => { toast({ title: "Walk-forward gate recorded" }); invalidateAll(); },
    onError: (e: any) => toast({ title: "Walk-forward failed", description: e.message, variant: "destructive" }),
  });

  // ─── Incubation mutations ───────────────────────────────

  const incubStartMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/strategies/${strategyId}/gates/incubation/start`, {
        requiredDays: parseInt(incubDays) || 90,
      }),
    onSuccess: () => { toast({ title: "Incubation started" }); invalidateAll(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const incubObsMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/strategies/${strategyId}/gates/incubation/observation`, {
        date: obsDate || new Date().toISOString().split("T")[0],
        observedReturn: parseFloat(obsReturn) || 0,
        observedDrawdown: parseFloat(obsDrawdown) || 0,
        source: obsSource,
        note: obsNote || undefined,
      }),
    onSuccess: () => {
      toast({ title: "Observation logged" });
      setObsReturn("");
      setObsDrawdown("");
      setObsNote("");
      setObsDate(new Date().toISOString().split("T")[0]);
      invalidateAll();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  const incubEvalMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/strategies/${strategyId}/gates/incubation/evaluate`, {}),
    onSuccess: (data: any) => {
      toast({ title: "Incubation evaluated", description: data?.verdict });
      invalidateAll();
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  // ─── render ─────────────────────────────────────────────

  const mcResult = latestFor("monte_carlo");
  const wfResult = latestFor("walk_forward");
  const incubResult = latestFor("incubation");

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full flex items-center justify-between text-text-secondary hover:text-text-primary px-0 h-7">
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <Activity className="h-3.5 w-3.5" />
            Pipeline Gates
          </span>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="space-y-3 pt-2">
        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-text-secondary">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Loading gate results…
          </div>
        )}

        {/* ── Monte Carlo ── */}
        <div className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FlaskConical className="h-3.5 w-3.5 text-text-secondary" />
              <span className="text-xs font-semibold text-text-primary">Monte Carlo</span>
              {mcResult && <VerdictBadge verdict={mcResult.verdict as Verdict} />}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs px-2"
              onClick={() => mcMutation.mutate()}
              disabled={mcMutation.isPending}
            >
              {mcMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
              Run
            </Button>
          </div>

          {mcResult && (
            <>
              {/* DSR section */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-secondary">Deflated Sharpe (DSR)</span>
                  <button
                    onClick={() => setMcExpanded(v => !v)}
                    className="text-xs text-text-secondary hover:text-text-primary"
                  >
                    {mcExpanded ? "Less" : "More"}
                  </button>
                </div>
                <DSRBar
                  dsr={(mcResult.metrics as any)?.dsr?.dsr}
                  notValid={(mcResult.metrics as any)?.dsr?.notValid}
                />
                {(mcResult.metrics as any)?.dsr?.interpretation && !((mcResult.metrics as any)?.dsr?.notValid) && (
                  <p className="text-xs text-text-secondary italic">
                    {(mcResult.metrics as any).dsr.interpretation}
                  </p>
                )}
                {(mcResult.metrics as any)?.dsr?.notValid && (
                  <p className="text-xs text-text-secondary italic">
                    DSR not computed: simulated data.
                  </p>
                )}
              </div>

              {mcExpanded && (
                <>
                  <MonteCarloMetricsRow metrics={mcResult.metrics as any} />
                  {mcResult.reason && (
                    <p className="text-xs text-text-secondary mt-1">{mcResult.reason}</p>
                  )}
                  <p className="text-xs text-text-secondary">
                    Trials used for DSR deflation: {(mcResult.metrics as any)?.dsr?.trialCount ?? "—"}
                  </p>
                </>
              )}
            </>
          )}

          {!mcResult && (
            <p className="text-xs text-text-secondary italic">No result yet. Run to evaluate.</p>
          )}
        </div>

        {/* ── Walk-Forward ── */}
        <div className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-text-secondary" />
              <span className="text-xs font-semibold text-text-primary">Walk-Forward</span>
              {wfResult && <VerdictBadge verdict={wfResult.verdict as Verdict} />}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs px-2"
              onClick={() => setWfExpanded(v => !v)}
            >
              {wfExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              Config
            </Button>
          </div>

          {!wfResult && (
            <p className="text-xs text-text-secondary italic">
              Requires a real backtest engine — records cannot_evaluate automatically.
            </p>
          )}
          {wfResult && (
            <p className="text-xs text-text-secondary italic">{wfResult.reason}</p>
          )}

          {wfExpanded && (
            <WalkForwardConfigForm strategyId={strategyId} onSaved={invalidateAll} />
          )}

          <Button
            size="sm"
            variant="ghost"
            className="h-6 text-xs w-full text-text-secondary"
            onClick={() => wfMutation.mutate()}
            disabled={wfMutation.isPending}
          >
            {wfMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : null}
            Record gate (cannot_evaluate)
          </Button>
        </div>

        {/* ── Incubation ── */}
        <div className="border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-text-secondary" />
              <span className="text-xs font-semibold text-text-primary">Incubation</span>
              {incubResult && <VerdictBadge verdict={incubResult.verdict as Verdict} />}
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs px-2"
              onClick={() => setIncubExpanded(v => !v)}
            >
              {incubExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </Button>
          </div>

          <IncubationCountdown strategy={strategyData} />

          {incubExpanded && (
            <div className="space-y-3 pt-1">
              {!strategyData?.incubationStartedAt && (
                <div className="flex items-end gap-2">
                  <div className="flex-1 space-y-1">
                    <Label className="text-xs">Required days</Label>
                    <Input
                      type="number"
                      className="h-7 text-xs"
                      value={incubDays}
                      onChange={e => setIncubDays(e.target.value)}
                      min={1}
                    />
                  </div>
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => incubStartMutation.mutate()}
                    disabled={incubStartMutation.isPending}
                  >
                    Start
                  </Button>
                </div>
              )}

              {strategyData?.incubationStartedAt && (
                <>
                  {/* ── Log observation form ──────────────────── */}
                  <div className="space-y-2 border border-border rounded-md p-2">
                    <p className="text-xs font-medium text-text-primary">Log observation</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Return</Label>
                        <Input
                          type="number"
                          step="0.001"
                          className="h-7 text-xs"
                          placeholder="0.05"
                          value={obsReturn}
                          onChange={e => setObsReturn(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Max Drawdown</Label>
                        <Input
                          type="number"
                          step="0.001"
                          className="h-7 text-xs"
                          placeholder="0.03"
                          value={obsDrawdown}
                          onChange={e => setObsDrawdown(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Date</Label>
                        <Input
                          type="date"
                          className="h-7 text-xs"
                          value={obsDate}
                          onChange={e => setObsDate(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Source</Label>
                        <Select value={obsSource} onValueChange={(v) => setObsSource(v as any)}>
                          <SelectTrigger className="h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="manual">Manual</SelectItem>
                            <SelectItem value="paper">Paper</SelectItem>
                            <SelectItem value="live">Live</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Note (optional)</Label>
                      <Input
                        className="h-7 text-xs"
                        placeholder="e.g. week 3, gap-fill event"
                        value={obsNote}
                        onChange={e => setObsNote(e.target.value)}
                      />
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs w-full gap-1"
                      onClick={() => incubObsMutation.mutate()}
                      disabled={incubObsMutation.isPending || !obsReturn}
                    >
                      <Plus className="h-3 w-3" />
                      Log Observation
                    </Button>
                  </div>

                  {/* ── Observations table ────────────────────── */}
                  {(strategyData?.incubationObservations?.length ?? 0) > 0 && (
                    <IncubationObsTable
                      observations={strategyData.incubationObservations}
                    />
                  )}

                  {/* ── Forward vs expected comparison ───────── */}
                  {(strategyData?.incubationObservations?.length ?? 0) >= 3 && (
                    <IncubationComparison
                      observations={strategyData.incubationObservations}
                      expectedReturn={strategyData.performance}
                      expectedMaxDrawdown={strategyData.maxDrawdown}
                      hasLiveBacktest={false}
                    />
                  )}

                  {/* ── Sparkline chart ───────────────────────── */}
                  {(strategyData?.incubationObservations?.length ?? 0) >= 2 && (
                    <IncubationSparkline observations={strategyData.incubationObservations} />
                  )}

                  <Button
                    size="sm"
                    className="h-7 text-xs w-full"
                    onClick={() => incubEvalMutation.mutate()}
                    disabled={incubEvalMutation.isPending}
                  >
                    Evaluate Gate
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* simulated caveat */}
        <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <span>No gate can return a pass on simulated data. Connect a live backtest engine to enable gate evaluation.</span>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ─── Incubation sub-components ──────────────────────────────

const SOURCE_COLORS: Record<string, string> = {
  live: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  paper: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  manual: "bg-slate-500/15 text-slate-400 border-slate-500/30",
};

function SourceBadge({ source }: { source?: string }) {
  const s = source ?? "manual";
  return (
    <Badge className={`capitalize text-xs px-1.5 py-0 ${SOURCE_COLORS[s] ?? SOURCE_COLORS.manual}`}>
      {s}
    </Badge>
  );
}

function IncubationObsTable({ observations }: { observations: any[] }) {
  const sorted = [...observations].reverse(); // newest first
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-text-primary">Observations ({observations.length})</p>
      <div className="rounded-md border border-border overflow-auto max-h-48">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border bg-surface-raised">
              <th className="text-left px-2 py-1 text-text-secondary font-medium">Date</th>
              <th className="text-right px-2 py-1 text-text-secondary font-medium">Return</th>
              <th className="text-right px-2 py-1 text-text-secondary font-medium">DD</th>
              <th className="text-center px-2 py-1 text-text-secondary font-medium">Source</th>
              <th className="text-left px-2 py-1 text-text-secondary font-medium">Note</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((obs, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-surface-raised/50">
                <td className="px-2 py-1 tabular-nums text-text-secondary">{obs.date}</td>
                <td className={`px-2 py-1 tabular-nums text-right font-medium ${obs.observedReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {obs.observedReturn >= 0 ? "+" : ""}{(obs.observedReturn * 100).toFixed(2)}%
                </td>
                <td className="px-2 py-1 tabular-nums text-right text-amber-400">
                  {(obs.observedDrawdown * 100).toFixed(2)}%
                </td>
                <td className="px-2 py-1 text-center">
                  <SourceBadge source={obs.source} />
                </td>
                <td className="px-2 py-1 text-text-secondary truncate max-w-[80px]">{obs.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IncubationComparison({
  observations,
  expectedReturn,
  expectedMaxDrawdown,
  hasLiveBacktest,
}: {
  observations: any[];
  expectedReturn?: number | null;
  expectedMaxDrawdown?: number | null;
  hasLiveBacktest: boolean;
}) {
  if (observations.length < 3) return null;

  const avgReturn = observations.reduce((s: number, o: any) => s + o.observedReturn, 0) / observations.length;
  const avgDrawdown = observations.reduce((s: number, o: any) => s + o.observedDrawdown, 0) / observations.length;
  const expRet = expectedReturn ?? 0;
  const expDD = expectedMaxDrawdown ?? 0;
  const ddTolerance = expDD * DD_BLOWOUT_FACTOR;

  const ddBlowout = avgDrawdown > ddTolerance;
  const netNegative = avgReturn < 0;
  const status = ddBlowout || netNegative ? "diverging" : "tracking";

  return (
    <div className="space-y-2 border border-border rounded-md p-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-text-primary flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />
          Forward vs Expected
        </p>
        <Badge className={status === "tracking"
          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs"
          : "bg-red-500/15 text-red-400 border-red-500/30 text-xs"
        }>
          {status === "tracking" ? "Tracking" : "Diverging"}
        </Badge>
      </div>

      {!hasLiveBacktest && (
        <p className="text-xs text-amber-400 flex items-center gap-1">
          <AlertTriangle className="h-3 w-3 shrink-0" />
          Baseline not validated (no live_engine backtest)
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-raised rounded p-2 space-y-1">
          <p className="text-xs text-text-secondary">Return</p>
          <div className="flex items-end justify-between">
            <span className={`text-sm font-semibold ${avgReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {avgReturn >= 0 ? "+" : ""}{(avgReturn * 100).toFixed(2)}%
            </span>
            <span className="text-xs text-text-secondary">exp {(expRet * 100).toFixed(1)}%</span>
          </div>
          {netNegative && (
            <p className="text-xs text-red-400">Net negative ✗</p>
          )}
        </div>
        <div className="bg-surface-raised rounded p-2 space-y-1">
          <p className="text-xs text-text-secondary">Drawdown</p>
          <div className="flex items-end justify-between">
            <span className={`text-sm font-semibold ${ddBlowout ? "text-red-400" : "text-amber-400"}`}>
              {(avgDrawdown * 100).toFixed(2)}%
            </span>
            <span className="text-xs text-text-secondary">tol {(ddTolerance * 100).toFixed(1)}%</span>
          </div>
          {ddBlowout && (
            <p className="text-xs text-red-400">Blowout ({DD_BLOWOUT_FACTOR}×) ✗</p>
          )}
        </div>
      </div>
    </div>
  );
}

function IncubationSparkline({ observations }: { observations: any[] }) {
  if (observations.length < 2) return null;

  const data = [...observations]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((o) => ({
      date: o.date,
      return: +(o.observedReturn * 100).toFixed(2),
      drawdown: +(o.observedDrawdown * 100).toFixed(2),
    }));

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-text-primary">Trend</p>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
          <XAxis dataKey="date" hide />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 9 }} />
          <Tooltip
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, fontSize: 10 }}
            formatter={(v: any, name: string) => [`${v}%`, name === "return" ? "Return" : "Drawdown"]}
            labelFormatter={(l) => l}
          />
          <ReferenceLine y={0} stroke="var(--text-secondary)" strokeDasharray="3 3" />
          <Line type="monotone" dataKey="return" stroke="#10b981" strokeWidth={1.5} dot={{ r: 2 }} name="return" />
          <Line type="monotone" dataKey="drawdown" stroke="#f59e0b" strokeWidth={1.5} dot={{ r: 2 }} name="drawdown" />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Walk-forward config sub-form ───────────────────────────

function WalkForwardConfigForm({ strategyId, onSaved }: { strategyId: string; onSaved: () => void }) {
  const { toast } = useToast();
  const [inSample, setInSample] = useState("252");
  const [outSample, setOutSample] = useState("63");
  const [windows, setWindows] = useState("5");
  const [anchored, setAnchored] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", `/api/strategies/${strategyId}/gates/walk-forward/config`, {
        inSampleDays: parseInt(inSample),
        outOfSampleDays: parseInt(outSample),
        numWindows: parseInt(windows),
        anchored,
      }),
    onSuccess: () => { toast({ title: "Walk-forward config saved" }); onSaved(); },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-2 border-t border-border pt-2">
      <p className="text-xs font-medium text-text-primary">Walk-Forward Config</p>
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">IS days</Label>
          <Input className="h-7 text-xs" type="number" value={inSample} onChange={e => setInSample(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">OOS days</Label>
          <Input className="h-7 text-xs" type="number" value={outSample} onChange={e => setOutSample(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Windows</Label>
          <Input className="h-7 text-xs" type="number" value={windows} onChange={e => setWindows(e.target.value)} />
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          checked={anchored}
          onChange={e => setAnchored(e.target.checked)}
          className="accent-primary"
        />
        Anchored (expanding IS window)
      </label>
      <Button
        size="sm"
        variant="outline"
        className="h-7 text-xs w-full"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        Save Config
      </Button>
    </div>
  );
}
