import cron from "node-cron";
import { runAllIncubationGhostRuns } from "../services/incubation-runner";
import { isLeanAvailable } from "../services/lean-runner";

// ─────────────────────────────────────────────────────────────
//  Optional in-process scheduler (Phase 12).
//
//  Set INCUBATION_CRON to a cron expression (e.g. "0 2 * * *" for 2am
//  daily) to auto-run incubation ghost runs. Unset = no in-process
//  scheduling; drive ghost runs via POST /api/incubation/ghost-run
//  from an external scheduler (Windows Task Scheduler / cron) instead —
//  more robust when the app is not running 24/7.
// ─────────────────────────────────────────────────────────────

export function startScheduler(): void {
  const expr = process.env.INCUBATION_CRON;
  if (!expr) return;
  if (!cron.validate(expr)) {
    console.error(`[scheduler] INCUBATION_CRON is not a valid cron expression: "${expr}" — scheduler off.`);
    return;
  }
  if (!isLeanAvailable()) {
    console.warn("[scheduler] INCUBATION_CRON set but LEAN is disabled; ghost runs would no-op. Scheduler off.");
    return;
  }

  cron.schedule(expr, async () => {
    const started = new Date().toISOString();
    try {
      const batch = await runAllIncubationGhostRuns();
      if (batch.ran) {
        const logged = batch.results.reduce((n, r) => n + r.newObservations, 0);
        const breached = batch.results.filter((r) => r.quitRuleBreached).map((r) => r.name);
        console.log(
          `[scheduler] ghost runs @ ${started}: ${batch.results.length} strateg(ies), ${logged} new paper day(s)` +
          (breached.length ? `; QUIT RULE BREACHED: ${breached.join(", ")}` : "")
        );
      } else {
        console.log(`[scheduler] ghost runs skipped @ ${started}: ${batch.skippedReason}`);
      }
    } catch (err) {
      console.error("[scheduler] ghost-run batch failed:", (err as Error).message);
    }
  });

  console.log(`[scheduler] incubation ghost runs scheduled: "${expr}"`);
}
