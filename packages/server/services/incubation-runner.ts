// ─────────────────────────────────────────────────────────────
//  Incubation ghost runs (Phase 12)
//
//  Davey Ch 14/23: after a strategy passes Monte Carlo it incubates —
//  watched on forward data it never saw at approval time. Nobody hand-
//  enters 90 days of daily P&L, so this re-runs each incubating
//  strategy's LOCKED code over [incubationStart, today] on the current
//  data and appends any NEW trading days as source:"paper" observations.
//
//  Discipline notes:
//   - Ghost runs are MEASUREMENT, not selection — they never record a
//     trial and never deflate the DSR. We call the engine directly, not
//     the trial-recording backtest route.
//   - Idempotent: keyed on date, re-running a day never double-logs.
//   - The strategy's code is whatever is linked; we do not re-tune it.
//     (Changing the code mid-incubation would be a new strategy.)
// ─────────────────────────────────────────────────────────────

import { storage } from "../storage";
import { isLeanAvailable, runLeanBacktest } from "./lean-runner";
import { buildTrackingReport } from "./monitoring";
import { getIO } from "../ws";
import { sendAlert } from "../lib/notify";
import type { IncubationObservation, Strategy } from "@shared/schema";

/**
 * Turn an equity curve into ONE paper observation per calendar day from
 * startDate on. LEAN's equity chart emits several points per day (on data
 * events and trades), so we first collapse to the end-of-day value per date,
 * then diff consecutive daily closes into P&L.
 */
export function equityCurveToObservations(
  curve: Array<{ date: string; value: number }>,
  startDate: string
): IncubationObservation[] {
  if (curve.length < 2) return [];
  // End-of-day close per date (curve is time-ordered → last point wins).
  const byDay = new Map<string, number>();
  for (const p of curve) byDay.set(p.date.slice(0, 10), p.value);
  const days = Array.from(byDay.entries()).sort(([a], [b]) => (a < b ? -1 : 1));
  if (days.length < 2) return [];

  const obs: IncubationObservation[] = [];
  let peak = days[0][1];
  for (let i = 1; i < days.length; i++) {
    const [date, cur] = days[i];
    const prev = days[i - 1][1];
    if (cur > peak) peak = cur; // peak tracks across all days, incl. pre-start
    if (date < startDate) continue;
    const dd = peak > 0 ? (peak - cur) / peak : 0;
    obs.push({
      date,
      observedPnL: cur - prev,
      observedReturn: prev !== 0 ? (cur - prev) / prev : 0,
      observedDrawdown: dd,
      source: "paper",
      note: "ghost run",
    });
  }
  return obs;
}

export interface GhostRunResult {
  strategyId: string;
  name: string;
  status: "ran" | "skipped" | "error";
  newObservations: number;
  totalObservations?: number;
  quitRuleBreached?: boolean;
  detail: string;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function runIncubationGhostRun(strategyId: string): Promise<GhostRunResult> {
  const s = await storage.getStrategyById(strategyId);
  if (!s) return { strategyId, name: "?", status: "error", newObservations: 0, detail: "not found" };

  const base = { strategyId, name: s.name, newObservations: 0 };
  if (s.stage !== "incubation") return { ...base, status: "skipped", detail: "not in incubation stage" };
  if (!s.incubationStartedAt) return { ...base, status: "skipped", detail: "incubation not started" };
  if (!s.leanProjectName) return { ...base, status: "skipped", detail: "no linked LEAN project" };
  if (!isLeanAvailable()) return { ...base, status: "skipped", detail: "LEAN engine disabled" };

  const project = await storage.getLeanProjectByName(s.leanProjectName);
  if (!project) return { ...base, status: "skipped", detail: `linked project "${s.leanProjectName}" not found` };

  const startDate = new Date(s.incubationStartedAt).toISOString().slice(0, 10);

  let result;
  try {
    result = await runLeanBacktest({
      projectName: s.leanProjectName,
      code: project.code,
      parameters: { wf_start: startDate, wf_end: today() },
    });
  } catch (err) {
    const detail = (err as Error).message;
    await sendAlert({
      kind: "ghost_run_error", strategyId, strategyName: s.name, detail, at: new Date().toISOString(),
    });
    return { ...base, status: "error", detail };
  }

  const existing = new Set((s.incubationObservations ?? []).map((o) => o.date));
  const candidates = equityCurveToObservations(result.equityCurve, startDate);
  const fresh = candidates.filter((o) => !existing.has(o.date));

  let updated: Strategy = s;
  for (const o of fresh) {
    updated = await storage.addIncubationObservation(strategyId, o);
  }

  // Re-evaluate tracking once, emit, and alarm on a quit-rule breach —
  // the same behavior the manual observation route provides.
  const tracking = updated.expectedPerformance ? buildTrackingReport(updated) : null;
  const breached =
    tracking && !("error" in tracking) && tracking.quitRuleStatus?.breached === true;

  getIO()?.emit("incubation:observed", {
    strategyId,
    strategyName: s.name,
    newObservations: fresh.length,
    totalObservations: (updated.incubationObservations ?? []).length,
    bandPosition: tracking && !("error" in tracking) ? tracking.bandPosition : null,
    at: new Date().toISOString(),
  });

  if (breached && tracking && !("error" in tracking)) {
    const detail = tracking.quitRuleStatus!.detail;
    getIO()?.emit("risk:alert", {
      strategyId, strategyName: s.name, type: "quit_rule_breached", detail, at: new Date().toISOString(),
    });
    await sendAlert({
      kind: "quit_rule_breached", strategyId, strategyName: s.name, detail, at: new Date().toISOString(),
    });
  }

  return {
    ...base,
    status: "ran",
    newObservations: fresh.length,
    totalObservations: (updated.incubationObservations ?? []).length,
    quitRuleBreached: breached || false,
    detail: fresh.length > 0
      ? `logged ${fresh.length} paper day(s)${breached ? " — QUIT RULE BREACHED" : ""}`
      : "no new trading days since last run",
  };
}

// Guard so a slow batch (each ghost run spawns Docker) never overlaps itself.
let batchRunning = false;

export async function runAllIncubationGhostRuns(): Promise<{
  ran: boolean; results: GhostRunResult[]; skippedReason?: string;
}> {
  if (batchRunning) return { ran: false, results: [], skippedReason: "a ghost-run batch is already in progress" };
  batchRunning = true;
  try {
    const strategies = await storage.getStrategies();
    const incubating = strategies.filter((s) => s.stage === "incubation");
    const results: GhostRunResult[] = [];
    for (const s of incubating) {
      results.push(await runIncubationGhostRun(s.id)); // sequential: one Docker run at a time
    }
    return { ran: true, results };
  } finally {
    batchRunning = false;
  }
}
