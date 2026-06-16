import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Header from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown, FileText,
} from "lucide-react";
import {
  ComposedChart, Area, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from "recharts";

// ── band → label/colour ─────────────────────────────────────
const BAND_LABEL: Record<string, { text: string; cls: string }> = {
  above_p97_5: { text: "Above P97.5 (too good?)", cls: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  p90_to_p97_5: { text: "P90–P97.5", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  p50_to_p90: { text: "P50–P90", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  p10_to_p50: { text: "P10–P50", cls: "bg-slate-500/15 text-slate-300 border-slate-500/30" },
  p2_5_to_p10: { text: "P2.5–P10 (watch)", cls: "bg-orange-500/15 text-orange-400 border-orange-500/30" },
  below_p2_5: { text: "Below P2.5 (alarm)", cls: "bg-red-500/15 text-red-400 border-red-500/30" },
  unknown: { text: "No data", cls: "bg-slate-500/15 text-slate-400 border-slate-500/30" },
};

function pct(v: number | null | undefined): string {
  return v == null ? "—" : `${(v * 100).toFixed(0)}%`;
}
function usd(v: number | null | undefined): string {
  return v == null ? "—" : `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

interface SummaryRow {
  id: string; name: string; stage: string; observationCount: number;
  cumulativePnL: number | null; bandPosition: string | null;
  returnEfficiency: number | null; drawdownEfficiency: number | null;
  warnings: string[]; quitRuleBreached: boolean; hasQuitRule: boolean;
  hasBaseline: boolean; lastReviewAt: string | null; reviewDue: boolean;
}

export default function Monitoring() {
  const [selected, setSelected] = useState<string | null>(null);
  const { data: rows = [], isLoading } = useQuery<SummaryRow[]>({
    queryKey: ["/api/monitoring/summary"],
    queryFn: () => fetch("/api/monitoring/summary").then((r) => r.json()),
    refetchInterval: 30000,
  });

  return (
    <div className="flex-1 flex flex-col">
      <Header
        title="Monitoring"
        subtitle="Live & incubating strategies vs their expected-performance baseline (Davey Ch 23–24)"
      />
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {isLoading && <p className="text-sm text-text-secondary">Loading…</p>}
        {!isLoading && rows.length === 0 && (
          <div className="border border-border rounded-lg p-8 text-center">
            <Clock className="h-8 w-8 text-text-secondary mx-auto mb-2" />
            <p className="text-sm text-text-secondary">
              No strategies are incubating or live yet. Strategies appear here once they
              reach the incubation stage with a Monte Carlo baseline.
            </p>
          </div>
        )}

        {rows.length > 0 && (
          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-surface-raised text-text-secondary">
                <tr>
                  <th className="text-left p-3 font-medium">Strategy</th>
                  <th className="text-left p-3 font-medium">Stage</th>
                  <th className="text-right p-3 font-medium">Cum P&amp;L</th>
                  <th className="text-center p-3 font-medium">Band</th>
                  <th className="text-right p-3 font-medium">Ret Eff</th>
                  <th className="text-right p-3 font-medium">DD Eff</th>
                  <th className="text-center p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const band = BAND_LABEL[r.bandPosition ?? "unknown"];
                  return (
                    <tr
                      key={r.id}
                      className="border-t border-border hover:bg-surface-raised/50 cursor-pointer"
                      onClick={() => setSelected(r.id)}
                    >
                      <td className="p-3 font-medium text-text-primary">{r.name}</td>
                      <td className="p-3">
                        <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 capitalize">
                          {r.stage}
                        </Badge>
                      </td>
                      <td className="p-3 text-right tabular-nums text-text-primary">{usd(r.cumulativePnL)}</td>
                      <td className="p-3 text-center">
                        <Badge className={band.cls}>{band.text}</Badge>
                      </td>
                      <td className="p-3 text-right tabular-nums">{pct(r.returnEfficiency)}</td>
                      <td className="p-3 text-right tabular-nums">{pct(r.drawdownEfficiency)}</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1">
                          {r.quitRuleBreached && (
                            <Badge className="bg-red-500/15 text-red-400 border-red-500/30 gap-1">
                              <AlertTriangle className="h-3 w-3" /> Quit
                            </Badge>
                          )}
                          {r.reviewDue && (
                            <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 gap-1">
                              <FileText className="h-3 w-3" /> Review
                            </Badge>
                          )}
                          {!r.quitRuleBreached && !r.reviewDue && r.hasBaseline && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                          )}
                          {!r.hasBaseline && (
                            <span className="text-xs text-text-secondary">no baseline</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
          {selected && <StrategyDetail strategyId={selected} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StrategyDetail({ strategyId }: { strategyId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data, isLoading } = useQuery<any>({
    queryKey: ["/api/strategies", strategyId, "monitoring"],
    queryFn: () => fetch(`/api/strategies/${strategyId}/monitoring`).then((r) => r.json()),
  });

  if (isLoading) return <p className="text-sm text-text-secondary">Loading…</p>;
  if (!data || data.error) {
    return (
      <>
        <DialogHeader><DialogTitle>Monitoring</DialogTitle></DialogHeader>
        <p className="text-sm text-text-secondary">{data?.error ?? "Unavailable."}</p>
      </>
    );
  }

  const t = data.tracking;
  // Daily tracking chart (Davey Fig 23.8): actual cumulative P&L over the
  // MC percentile bands.
  const chartData = (t.points ?? []).map((p: any) => ({
    trade: p.index,
    actual: p.cumulativePnL,
    p2_5: p.expected?.p2_5 ?? null,
    p10: p.expected?.p10 ?? null,
    p50: p.expected?.p50 ?? null,
    p90: p.expected?.p90 ?? null,
    p97_5: p.expected?.p97_5 ?? null,
    // stacked band widths for shading
    lower: p.expected?.p2_5 ?? null,
    midBand: p.expected ? p.expected.p97_5 - p.expected.p2_5 : null,
  }));

  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {data.name}
          <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 capitalize">{data.stage}</Badge>
        </DialogTitle>
      </DialogHeader>

      <div className="space-y-4">
        {t.warnings?.length > 0 && (
          <div className="space-y-1">
            {t.warnings.map((w: string, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded p-2">
                <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-4 gap-2">
          <Stat label="Cum P&L" value={usd(t.cumulativePnL)} />
          <Stat label="Max DD" value={usd(t.maxDrawdownUsd)} />
          <Stat label="Return Eff" value={pct(t.returnEfficiency)} />
          <Stat label="Drawdown Eff" value={pct(t.drawdownEfficiency)} />
        </div>

        {chartData.length > 0 && (
          <div className="border border-border rounded-lg p-3">
            <p className="text-xs font-medium text-text-primary mb-2">
              Cumulative P&L vs expectation bands
            </p>
            <ResponsiveContainer width="100%" height={240}>
              <ComposedChart data={chartData}>
                <XAxis dataKey="trade" tick={{ fontSize: 11 }} stroke="currentColor" className="text-text-secondary" />
                <YAxis tick={{ fontSize: 11 }} stroke="currentColor" className="text-text-secondary" />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--surface-raised))", border: "1px solid hsl(var(--border))", fontSize: 12 }}
                  formatter={(v: any) => (typeof v === "number" ? `$${v.toFixed(0)}` : v)}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {/* 95% band shaded via stacked areas (lower invisible, mid translucent) */}
                <Area type="monotone" dataKey="lower" stackId="band" stroke="none" fill="transparent" name="" legendType="none" />
                <Area type="monotone" dataKey="midBand" stackId="band" stroke="none" fill="hsl(var(--primary) / 0.12)" name="P2.5–P97.5" />
                <Line type="monotone" dataKey="p50" stroke="hsl(var(--text-secondary))" strokeDasharray="4 3" dot={false} name="P50 (expected)" />
                <Line type="monotone" dataKey="p10" stroke="hsl(var(--text-secondary) / 0.5)" strokeDasharray="2 2" dot={false} name="P10" />
                <Line type="monotone" dataKey="actual" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="Actual" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {data.quitRule && (
          <div className="border border-border rounded-lg p-3 text-xs">
            <span className="font-medium text-text-primary">Quit rule: </span>
            <span className="text-text-secondary">
              {data.quitRule.type === "max_drawdown_usd"
                ? `Stop at $${data.quitRule.value.toLocaleString()} drawdown.`
                : `Stop below the P${data.quitRule.value} band.`}
            </span>
            {t.quitRuleStatus && (
              <span className={t.quitRuleStatus.breached ? "text-red-400 ml-1" : "text-emerald-400 ml-1"}>
                {t.quitRuleStatus.detail}
              </span>
            )}
          </div>
        )}

        <ReviewForm
          strategyId={strategyId}
          reviews={data.reviews ?? []}
          onSaved={() => {
            qc.invalidateQueries({ queryKey: ["/api/strategies", strategyId, "monitoring"] });
            qc.invalidateQueries({ queryKey: ["/api/monitoring/summary"] });
            toast({ title: "Review saved" });
          }}
        />
      </div>
    </>
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

function ReviewForm({ strategyId, reviews, onSaved }: { strategyId: string; reviews: any[]; onSaved: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    periodLabel: "", surprised: "", resultsInLineWithExpectations: "",
    fillsComparable: "", reasonToStop: "", reasonToChangeSizing: "", note: "",
  });
  const mutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/strategies/${strategyId}/reviews`, form),
    onSuccess: () => {
      onSaved();
      setOpen(false);
      setForm({ periodLabel: "", surprised: "", resultsInLineWithExpectations: "", fillsComparable: "", reasonToStop: "", reasonToChangeSizing: "", note: "" });
    },
  });

  return (
    <div className="border border-border rounded-lg p-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-primary flex items-center gap-1">
          <FileText className="h-3.5 w-3.5" /> Reviews ({reviews.length})
        </span>
        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setOpen((v) => !v)}>
          {open ? "Cancel" : "New review"}
        </Button>
      </div>

      {open && (
        <div className="space-y-2 pt-2">
          <div>
            <Label className="text-xs">Period (e.g. "Week 4")</Label>
            <Input className="h-7 text-xs" value={form.periodLabel} onChange={(e) => setForm({ ...form, periodLabel: e.target.value })} />
          </div>
          {[
            ["surprised", "Surprised at this result?"],
            ["resultsInLineWithExpectations", "Results in line with expectations?"],
            ["fillsComparable", "Fills comparable to the backtest?"],
            ["reasonToStop", "Any reason to stop trading?"],
            ["reasonToChangeSizing", "Any reason to change sizing?"],
          ].map(([key, label]) => (
            <div key={key}>
              <Label className="text-xs">{label}</Label>
              <Input
                className="h-7 text-xs"
                value={(form as any)[key]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              />
            </div>
          ))}
          <div>
            <Label className="text-xs">Notes</Label>
            <Textarea className="text-xs" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          </div>
          <Button size="sm" className="h-7 text-xs w-full" onClick={() => mutation.mutate()} disabled={mutation.isPending || !form.periodLabel}>
            Save review
          </Button>
        </div>
      )}

      {reviews.length > 0 && (
        <div className="space-y-1 pt-2 mt-2 border-t border-border">
          {reviews.slice(0, 3).map((rv) => (
            <div key={rv.id} className="text-xs text-text-secondary">
              <span className="font-medium text-text-primary">{rv.periodLabel}</span>
              {" — "}{rv.resultsInLineWithExpectations || "—"}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
