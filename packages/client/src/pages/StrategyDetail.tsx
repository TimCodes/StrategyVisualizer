import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSocketContext } from "@/contexts/SocketContext";
import {
  ArrowLeft, Play, RefreshCw, Lock, CheckCircle2, XCircle, HelpCircle,
  FlaskConical, TrendingUp, Scale, ShieldAlert, Link2, History, Shuffle,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceDot,
} from "recharts";

type Verdict = "pass" | "fail" | "cannot_evaluate";

function VerdictBadge({ verdict }: { verdict?: string | null }) {
  if (!verdict) return null;
  if (verdict === "pass")
    return <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1"><CheckCircle2 className="h-3 w-3" />Pass</Badge>;
  if (verdict === "fail")
    return <Badge className="bg-red-500/15 text-red-400 border-red-500/30 gap-1"><XCircle className="h-3 w-3" />Fail</Badge>;
  return <Badge className="bg-slate-500/15 text-slate-400 border-slate-500/30 gap-1"><HelpCircle className="h-3 w-3" />Cannot Evaluate</Badge>;
}

function Section({ icon: Icon, title, badge, action, children }: {
  icon: any; title: string; badge?: React.ReactNode; action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-text-secondary" />
          <span className="text-sm font-semibold text-text-primary">{title}</span>
          {badge}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-surface-raised rounded p-2 text-center">
      <div className="text-xs text-text-secondary">{label}</div>
      <div className="text-sm font-semibold text-text-primary tabular-nums">{value}</div>
    </div>
  );
}

const pct = (v: number | null | undefined, d = 1) => (v == null ? "—" : `${(v * 100).toFixed(d)}%`);
const num = (v: number | null | undefined, d = 2) => (v == null ? "—" : v.toFixed(d));

// ── f-sweep small multiple (single series; title carries identity) ──
function SweepChart({ title, data, dataKey, yFmt, threshold, recommendedF }: {
  title: string;
  data: any[];
  dataKey: string;
  yFmt: (v: number) => string;
  threshold?: number | null;
  recommendedF?: number | null;
}) {
  const recPoint = recommendedF != null ? data.find((p) => p.f === recommendedF) : null;
  return (
    <div className="bg-surface-raised rounded p-2">
      <p className="text-xs text-text-secondary mb-1">{title}</p>
      <ResponsiveContainer width="100%" height={140}>
        <LineChart data={data} margin={{ top: 6, right: 8, bottom: 0, left: -18 }}>
          <XAxis dataKey="f" tick={{ fontSize: 10 }} stroke="currentColor" className="text-text-secondary" />
          <YAxis tick={{ fontSize: 10 }} tickFormatter={yFmt} stroke="currentColor" className="text-text-secondary" />
          <Tooltip
            contentStyle={{ background: "hsl(var(--surface))", border: "1px solid hsl(var(--border))", fontSize: 11 }}
            formatter={(v: any) => yFmt(Number(v))}
            labelFormatter={(f) => `f = ${f}`}
          />
          {threshold != null && (
            <ReferenceLine y={threshold} stroke="hsl(var(--text-secondary))" strokeDasharray="4 3" strokeOpacity={0.6} />
          )}
          <Line type="monotone" dataKey={dataKey} stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
          {recPoint && (
            <ReferenceDot x={recPoint.f} y={recPoint[dataKey]} r={4}
              fill="hsl(var(--primary))" stroke="hsl(var(--surface))" strokeWidth={2} />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function StrategyDetail() {
  const [, params] = useRoute("/strategies/:id");
  const id = params?.id ?? "";
  const { toast } = useToast();
  const qc = useQueryClient();
  const { socket } = useSocketContext();

  const [projectInput, setProjectInput] = useState("");
  const [wfProgress, setWfProgress] = useState<string | null>(null);
  const [cpcvProgress, setCpcvProgress] = useState<string | null>(null);
  const [btRunning, setBtRunning] = useState(false);
  const [startingEquity, setStartingEquity] = useState("100000");
  const [sweep, setSweep] = useState<any | null>(null);
  const [quitType, setQuitType] = useState<"max_drawdown_usd" | "percentile_floor">("max_drawdown_usd");
  const [quitValue, setQuitValue] = useState("5000");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["/api/strategies", id] });
    qc.invalidateQueries({ queryKey: ["/api/strategies", id, "gate-results"] });
    qc.invalidateQueries({ queryKey: ["/api/strategies", id, "walk-forward", "runs"] });
  };

  const { data: s } = useQuery<any>({ queryKey: ["/api/strategies", id], enabled: !!id });
  const { data: gateResults = [] } = useQuery<any[]>({
    queryKey: ["/api/strategies", id, "gate-results"], enabled: !!id,
  });
  const { data: wfRuns = [] } = useQuery<any[]>({
    queryKey: ["/api/strategies", id, "walk-forward", "runs"], enabled: !!id,
  });
  const projectName = s?.leanProjectName;
  const { data: backtests = [] } = useQuery<any[]>({
    queryKey: ["/api/lean/projects", projectName, "results"],
    enabled: !!projectName,
    refetchInterval: btRunning ? 5000 : false,
  });

  const latestBt = backtests[0];
  useEffect(() => {
    if (btRunning && latestBt && latestBt.status !== "running") setBtRunning(false);
  }, [btRunning, latestBt]);

  // Walk-forward live progress
  useEffect(() => {
    if (!socket) return;
    const onProgress = (p: any) => setWfProgress(p?.message ?? null);
    const onComplete = () => { setWfProgress(null); invalidate(); toast({ title: "Walk-forward complete" }); };
    const onError = (e: any) => { setWfProgress(null); toast({ title: "Walk-forward failed", description: e?.error, variant: "destructive" }); };
    socket.on("wf:progress", onProgress);
    socket.on("wf:complete", onComplete);
    socket.on("wf:error", onError);
    const onCpcvProgress = (p: any) => setCpcvProgress(p?.message ?? null);
    const onCpcvComplete = () => { setCpcvProgress(null); invalidate(); toast({ title: "CPCV complete" }); };
    const onCpcvError = (e: any) => { setCpcvProgress(null); invalidate(); toast({ title: "CPCV failed", description: e?.error, variant: "destructive" }); };
    socket.on("cpcv:progress", onCpcvProgress);
    socket.on("cpcv:complete", onCpcvComplete);
    socket.on("cpcv:error", onCpcvError);
    return () => {
      socket.off("wf:progress", onProgress);
      socket.off("wf:complete", onComplete);
      socket.off("wf:error", onError);
      socket.off("cpcv:progress", onCpcvProgress);
      socket.off("cpcv:complete", onCpcvComplete);
      socket.off("cpcv:error", onCpcvError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, id]);

  const latestFor = (gate: string) => gateResults.find((r) => r.gate === gate);

  // ── mutations ────────────────────────────────────────────
  const linkMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/strategies/${id}`, { leanProjectName: projectInput }),
    onSuccess: () => { toast({ title: "Project linked" }); invalidate(); },
    onError: (e: any) => toast({ title: "Link failed", description: e.message, variant: "destructive" }),
  });

  const runBacktest = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/lean/projects/${projectName}/code`, { credentials: "include" });
      if (!res.ok) throw new Error("Linked project has no stored code — save it in the Editor first");
      const { code } = await res.json();
      return apiRequest("POST", `/api/lean/projects/${projectName}/backtest`, { code });
    },
    onSuccess: () => { setBtRunning(true); toast({ title: "Backtest running", description: "Real engine — takes a minute or two." }); },
    onError: (e: any) => toast({ title: "Backtest failed to start", description: e.message, variant: "destructive" }),
  });

  const gateRun = (gate: "feasibility" | "monte-carlo") =>
    useMutation({
      mutationFn: () => apiRequest("POST", `/api/strategies/${id}/gates/${gate}`, {}),
      onSuccess: async (r) => {
        const body = await r.json();
        toast({ title: `${gate === "feasibility" ? "Feasibility" : "Monte Carlo"}: ${body.verdict}`, description: (body.reason ?? "").slice(0, 140) });
        invalidate();
      },
      onError: (e: any) => toast({ title: "Gate failed", description: e.message, variant: "destructive" }),
    });
  const feasMutation = gateRun("feasibility");
  const mcMutation = gateRun("monte-carlo");

  const wfRunMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/strategies/${id}/gates/walk-forward/run`, {}),
    onSuccess: () => { setWfProgress("Starting walk-forward…"); toast({ title: "Walk-forward running", description: "Grid × windows on the real engine — several minutes." }); },
    onError: (e: any) => toast({ title: "Walk-forward failed to start", description: e.message, variant: "destructive" }),
  });

  const cpcvRunMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/strategies/${id}/gates/cpcv`, { numBlocks: 8 }),
    onSuccess: () => { setCpcvProgress("Starting CPCV…"); toast({ title: "CPCV running", description: "One backtest per grid combo, then combinatorial PBO." }); },
    onError: (e: any) => toast({ title: "CPCV failed to start", description: e.message, variant: "destructive" }),
  });

  const sweepMutation = useMutation({
    mutationFn: async () => {
      const r = await apiRequest("POST", `/api/strategies/${id}/sizing/sweep`, {
        startingEquity: parseFloat(startingEquity) || 100000,
      });
      return r.json();
    },
    onSuccess: (data) => setSweep(data),
    onError: (e: any) => toast({ title: "Sweep failed", description: e.message, variant: "destructive" }),
  });

  const lockPlanMutation = useMutation({
    mutationFn: () => {
      const rec = sweep?.sweep?.recommended;
      if (!rec) throw new Error("Run a sweep with a qualifying recommendation first");
      return apiRequest("POST", `/api/strategies/${id}/sizing/plan`, {
        model: "fixed_fractional",
        f: rec.f,
        largestLoss: sweep.largestLoss,
        startingCapital: sweep.capital?.requiredCapital ?? parseFloat(startingEquity),
        constraints: sweep.constraints,
      });
    },
    onSuccess: () => { toast({ title: "Sizing plan locked", description: "Immutable from here." }); invalidate(); },
    onError: (e: any) => toast({ title: "Lock failed", description: e.message, variant: "destructive" }),
  });

  const quitRuleMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/strategies/${id}/quit-rule`, {
      type: quitType, value: parseFloat(quitValue),
    }),
    onSuccess: () => { toast({ title: "Quit rule locked" }); invalidate(); },
    onError: (e: any) => toast({ title: "Lock failed", description: e.message, variant: "destructive" }),
  });

  if (!s) return <div className="flex-1 p-6 text-sm text-text-secondary">Loading…</div>;

  const latestWf = wfRuns[0];
  const feas = latestFor("feasibility");
  const mc = latestFor("monte_carlo");
  const latestLive = backtests.find((b) => b.status === "completed" && b.dataSource === "live_engine");

  return (
    <div className="flex-1 flex flex-col">
      <Header title={s.name} subtitle={s.description} />
      <div className="flex-1 overflow-auto p-6 space-y-4 max-w-5xl">
        <div className="flex items-center gap-2 flex-wrap">
          <Link href="/strategies">
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><ArrowLeft className="h-3 w-3" />Strategies</Button>
          </Link>
          <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 capitalize">{s.stage?.replace(/_/g, " ")}</Badge>
          <Badge className="bg-slate-500/15 text-slate-300 border-slate-500/30 capitalize">{s.gateStatus?.replace(/_/g, " ")}</Badge>
          {s.goals && <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1"><Lock className="h-3 w-3" />Goals</Badge>}
          {s.positionSizingPlan && <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1"><Lock className="h-3 w-3" />Sizing</Badge>}
          {s.quitRule && <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1"><Lock className="h-3 w-3" />Quit rule</Badge>}
        </div>

        {s.edge && (
          <div className="border border-border rounded-lg p-4">
            <p className="text-xs font-semibold text-text-primary mb-1">Edge (who loses, and why)</p>
            <p className="text-sm text-text-secondary">{s.edge}</p>
          </div>
        )}

        {/* ── LEAN project link + backtest ── */}
        <Section icon={Link2} title="LEAN project"
          badge={projectName ? <Badge className="bg-slate-500/15 text-slate-300 border-slate-500/30">{projectName}</Badge> : undefined}
          action={projectName && (
            <Button size="sm" variant="outline" className="h-7 text-xs" disabled={runBacktest.isPending || btRunning}
              onClick={() => runBacktest.mutate()}>
              {btRunning ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}
              {btRunning ? "Running…" : "Run backtest"}
            </Button>
          )}>
          {!projectName ? (
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label className="text-xs">Link a LEAN project (gates resolve its latest live-engine run)</Label>
                <Input className="h-8 text-xs" placeholder="e.g. Double7" value={projectInput}
                  onChange={(e) => setProjectInput(e.target.value)} />
              </div>
              <Button size="sm" className="h-8 text-xs" disabled={!projectInput || linkMutation.isPending}
                onClick={() => linkMutation.mutate()}>Link</Button>
            </div>
          ) : latestLive ? (
            <div className="grid grid-cols-5 gap-2">
              <Stat label="Return" value={`${num(latestLive.totalReturn)}%`} />
              <Stat label="Max DD" value={`${num(latestLive.maxDrawdown)}%`} />
              <Stat label="Sharpe" value={num(latestLive.sharpeRatio)} />
              <Stat label="Closed trades" value={String(latestLive.trades?.length ?? 0)} />
              <Stat label="Source" value={latestLive.dataSource} />
            </div>
          ) : (
            <p className="text-xs text-text-secondary italic">
              No completed live-engine backtest yet{latestBt?.errorLog ? ` — last run: ${latestBt.errorLog.slice(0, 120)}` : ""}. Run one to enable the gates.
            </p>
          )}
        </Section>

        {/* ── Feasibility + Monte Carlo ── */}
        <div className="grid md:grid-cols-2 gap-4">
          <Section icon={CheckCircle2} title="Feasibility" badge={<VerdictBadge verdict={feas?.verdict} />}
            action={<Button size="sm" variant="outline" className="h-7 text-xs" disabled={!s.goals || !projectName || feasMutation.isPending}
              onClick={() => feasMutation.mutate()}>
              {feasMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}Run
            </Button>}>
            {!s.goals && <p className="text-xs text-amber-400">Lock goals first (idea stage only).</p>}
            {feas?.reason && <p className="text-xs text-text-secondary">{feas.reason}</p>}
            {feas?.metrics && (
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Annualized" value={`${num(feas.metrics.annualizedReturnPct, 1)}%`} />
                <Stat label="Ret/DD" value={num(feas.metrics.retDDRatio)} />
                <Stat label="Trades/yr" value={num(feas.metrics.tradesPerYear, 0)} />
              </div>
            )}
          </Section>

          <Section icon={FlaskConical} title="Monte Carlo" badge={<VerdictBadge verdict={mc?.verdict} />}
            action={<Button size="sm" variant="outline" className="h-7 text-xs" disabled={!projectName || mcMutation.isPending}
              onClick={() => mcMutation.mutate()}>
              {mcMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}Run
            </Button>}>
            {mc?.reason && <p className="text-xs text-text-secondary">{mc.reason}</p>}
            {mc?.metrics && (
              <div className="grid grid-cols-3 gap-2">
                <Stat label="Med Ret/DD" value={num(mc.metrics.medianRetDDRatio)} />
                <Stat label="Risk of ruin" value={pct(mc.metrics.riskOfRuin)} />
                <Stat label="P(profit)" value={pct(mc.metrics.probProfit, 0)} />
              </div>
            )}
            {mc?.metrics?.dsr?.dsr != null && (
              <p className="text-xs text-text-secondary">DSR {num(mc.metrics.dsr.dsr)} after {mc.metrics.dsr.trialCount ?? "?"} trials</p>
            )}
          </Section>
        </div>

        {/* ── Walk-forward ── */}
        <Section icon={TrendingUp} title="Walk-forward" badge={<VerdictBadge verdict={latestFor("walk_forward")?.verdict} />}
          action={<Button size="sm" variant="outline" className="h-7 text-xs"
            disabled={!s.walkForwardConfig?.lockedAt || !projectName || !!wfProgress || wfRunMutation.isPending}
            onClick={() => wfRunMutation.mutate()}>
            {wfProgress ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}Run
          </Button>}>
          {!s.walkForwardConfig?.lockedAt && (
            <p className="text-xs text-text-secondary italic">No locked config. Lock windows + fitness + grid from the strategy card's pipeline panel (one shot).</p>
          )}
          {s.walkForwardConfig?.lockedAt && (
            <p className="text-xs text-text-secondary">
              IS {s.walkForwardConfig.inSampleDays}d / OOS {s.walkForwardConfig.outOfSampleDays}d × {s.walkForwardConfig.numWindows} windows,
              {" "}{s.walkForwardConfig.fitnessFunction}, from {s.walkForwardConfig.startDate ?? "?"} —
              grid: {(s.walkForwardConfig.parameters ?? []).map((p: any) => `${p.name}[${p.min}..${p.max}/${p.step}]`).join(", ") || "none"}
            </p>
          )}
          {wfProgress && <p className="text-xs text-amber-400">{wfProgress}</p>}
          {latestWf && latestWf.status === "completed" && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <Stat label="WFE" value={latestWf.wfe != null ? pct(latestWf.wfe, 0) : "—"} />
                <Stat label="PBO" value={num(latestWf.pbo)} />
                <Stat label="Windows +" value={`${(latestWf.windows ?? []).filter((w: any) => w.oosMetrics?.totalReturn > 0).length}/${(latestWf.windows ?? []).length}`} />
              </div>
              {(latestWf.windows ?? []).length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="text-text-secondary">
                      <tr><th className="text-left p-1">#</th><th className="text-left p-1">IS</th><th className="text-left p-1">Best params</th><th className="text-right p-1">IS ret</th><th className="text-right p-1">OOS ret</th></tr>
                    </thead>
                    <tbody>
                      {latestWf.windows.map((w: any) => (
                        <tr key={w.index} className="border-t border-border">
                          <td className="p-1">{w.index}</td>
                          <td className="p-1">{w.isStart}→{w.isEnd}</td>
                          <td className="p-1">{JSON.stringify(w.bestParams)}</td>
                          <td className="p-1 text-right tabular-nums">{num(w.isMetrics?.totalReturn, 1)}%</td>
                          <td className={`p-1 text-right tabular-nums ${w.oosMetrics?.totalReturn > 0 ? "text-emerald-400" : "text-red-400"}`}>{num(w.oosMetrics?.totalReturn, 1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {latestWf.reason && <p className="text-xs text-text-secondary">{latestWf.reason}</p>}
            </>
          )}
        </Section>

        {/* ── CPCV (López de Prado) ── */}
        <Section icon={Shuffle} title="CPCV (overfitting probability)" badge={<VerdictBadge verdict={latestFor("cpcv")?.verdict} />}
          action={<Button size="sm" variant="outline" className="h-7 text-xs"
            disabled={!s.walkForwardConfig?.lockedAt || !((s.walkForwardConfig?.parameters ?? []).length) || !projectName || !!cpcvProgress || cpcvRunMutation.isPending}
            onClick={() => cpcvRunMutation.mutate()}>
            {cpcvProgress ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}Run
          </Button>}>
          <p className="text-xs text-text-secondary">
            Combinatorial Purged Cross-Validation — stronger than single-split walk-forward.
            Runs each grid combo once, slices into blocks, and evaluates every IS/OOS split.
            PBO &lt; 0.5 means the in-sample-optimal config generalizes; ≥ 0.5 is overfit.
          </p>
          {!((s.walkForwardConfig?.parameters ?? []).length) && (
            <p className="text-xs text-amber-400">Needs a walk-forward config with a parameter grid (≥ 2 configs).</p>
          )}
          {cpcvProgress && <p className="text-xs text-amber-400">{cpcvProgress}</p>}
          {(() => {
            const c = latestFor("cpcv"); const m = c?.metrics as any;
            if (!c || !m) return null;
            return (
              <>
                <div className="grid grid-cols-4 gap-2">
                  <Stat label="PBO" value={num(m.pbo)} />
                  <Stat label="Blocks" value={String(m.numBlocks)} />
                  <Stat label="Paths" value={String(m.numPaths)} />
                  <Stat label="P(OOS loss)" value={pct(m.probLossOOS, 0)} />
                </div>
                {c.reason && <p className="text-xs text-text-secondary">{c.reason}</p>}
              </>
            );
          })()}
        </Section>

        {/* ── Position sizing ── */}
        <Section icon={Scale} title="Position sizing"
          badge={s.positionSizingPlan ? <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1"><Lock className="h-3 w-3" />f = {s.positionSizingPlan.f}</Badge> : undefined}>
          {s.positionSizingPlan ? (
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Fixed fraction" value={String(s.positionSizingPlan.f)} />
              <Stat label="Largest loss" value={`$${Math.round(s.positionSizingPlan.largestLoss).toLocaleString()}`} />
              <Stat label="Starting capital" value={`$${Math.round(s.positionSizingPlan.startingCapital).toLocaleString()}`} />
            </div>
          ) : (
            <>
              <div className="flex items-end gap-2">
                <div>
                  <Label className="text-xs">Starting equity ($)</Label>
                  <Input className="h-8 text-xs w-36" value={startingEquity} onChange={(e) => setStartingEquity(e.target.value)} />
                </div>
                <Button size="sm" variant="outline" className="h-8 text-xs" disabled={!projectName || sweepMutation.isPending}
                  onClick={() => sweepMutation.mutate()}>
                  {sweepMutation.isPending ? <RefreshCw className="h-3 w-3 animate-spin mr-1" /> : <Play className="h-3 w-3 mr-1" />}Run f-sweep
                </Button>
                {sweep?.sweep?.recommended && (
                  <Button size="sm" className="h-8 text-xs" disabled={lockPlanMutation.isPending} onClick={() => lockPlanMutation.mutate()}>
                    <Lock className="h-3 w-3 mr-1" />Lock plan @ f={sweep.sweep.recommended.f}
                  </Button>
                )}
              </div>
              {sweep && (
                <>
                  {/* Small multiples — different scales never share an axis */}
                  <div className="grid md:grid-cols-3 gap-2">
                    <SweepChart title="Median annual return vs f" data={sweep.sweep.points} dataKey="medianReturn"
                      yFmt={(v) => `${(v * 100).toFixed(0)}%`} recommendedF={sweep.sweep.recommended?.f} />
                    <SweepChart title="Median max drawdown vs f" data={sweep.sweep.points} dataKey="medianMaxDD"
                      yFmt={(v) => `${(v * 100).toFixed(0)}%`} threshold={sweep.constraints.maxDrawdownPct / 100}
                      recommendedF={sweep.sweep.recommended?.f} />
                    <SweepChart title="Risk of ruin vs f" data={sweep.sweep.points} dataKey="riskOfRuin"
                      yFmt={(v) => `${(v * 100).toFixed(0)}%`} threshold={sweep.constraints.maxRiskOfRuin}
                      recommendedF={sweep.sweep.recommended?.f} />
                  </div>
                  <p className="text-xs text-text-secondary">
                    {sweep.sweep.recommended
                      ? <>Recommended f = <b>{sweep.sweep.recommended.f}</b> (largest f inside the dashed constraint lines). Unconstrained optimal f = {sweep.sweep.optimalF.f} — reference only, never traded.</>
                      : <>No f satisfies the constraints — a losing system cannot be sized into a winner.</>}
                    {sweep.capital?.requiredCapital && <> Minimum capital for ruin ≤ {pct(sweep.constraints.maxRiskOfRuin, 0)}: <b>${sweep.capital.requiredCapital.toLocaleString()}</b>.</>}
                  </p>
                </>
              )}
            </>
          )}
        </Section>

        {/* ── Quit rule ── */}
        <Section icon={ShieldAlert} title="Quit rule"
          badge={s.quitRule ? <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1"><Lock className="h-3 w-3" />Locked</Badge> : undefined}>
          {s.quitRule ? (
            <p className="text-xs text-text-secondary">
              {s.quitRule.type === "max_drawdown_usd"
                ? `Stop trading at $${s.quitRule.value.toLocaleString()} drawdown.`
                : `Stop trading below the P${s.quitRule.value} expectation band.`}
              {" "}Locked {new Date(s.quitRule.lockedAt).toLocaleDateString()} — the plan is the plan.
            </p>
          ) : (
            <div className="flex items-end gap-2">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={quitType} onValueChange={(v) => setQuitType(v as any)}>
                  <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="max_drawdown_usd">Max drawdown ($)</SelectItem>
                    <SelectItem value="percentile_floor">Percentile floor (band)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">{quitType === "max_drawdown_usd" ? "Dollars" : "Band (2.5 or 10)"}</Label>
                <Input className="h-8 text-xs w-28" value={quitValue} onChange={(e) => setQuitValue(e.target.value)} />
              </div>
              <Button size="sm" variant="outline" className="h-8 text-xs" disabled={quitRuleMutation.isPending}
                onClick={() => quitRuleMutation.mutate()}>
                <Lock className="h-3 w-3 mr-1" />Lock (required before live)
              </Button>
            </div>
          )}
        </Section>

        {/* ── Gate history ── */}
        <Section icon={History} title={`Gate history (${(s.gateHistory ?? []).length})`}>
          {(s.gateHistory ?? []).length === 0 ? (
            <p className="text-xs text-text-secondary italic">No transitions yet.</p>
          ) : (
            <div className="space-y-1">
              {[...s.gateHistory].reverse().slice(0, 12).map((g: any, i: number) => (
                <div key={i} className="text-xs text-text-secondary flex gap-2">
                  <span className="tabular-nums">{new Date(g.at).toLocaleDateString()}</span>
                  <span className="capitalize text-text-primary">{g.stage?.replace(/_/g, " ")}</span>
                  <span className={g.result === "passed" ? "text-emerald-400" : g.result === "failed" ? "text-red-400" : ""}>{g.result}</span>
                  {g.note && <span className="truncate">— {g.note}</span>}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </div>
  );
}
