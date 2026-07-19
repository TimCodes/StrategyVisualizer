import { spawn } from "child_process";
import path from "path";
import cron from "node-cron";
import { runAllIncubationGhostRuns } from "../services/incubation-runner";
import { isLeanAvailable } from "../services/lean-runner";
import { runBackup } from "../services/backup";

// ─────────────────────────────────────────────────────────────
//  Optional in-process scheduler (Phase 12).
//
//  Set INCUBATION_CRON to a cron expression (e.g. "0 2 * * *" for 2am
//  daily) to auto-run incubation ghost runs. Unset = no in-process
//  scheduling; drive ghost runs via POST /api/incubation/ghost-run
//  from an external scheduler (Windows Task Scheduler / cron) instead —
//  more robust when the app is not running 24/7.
// ─────────────────────────────────────────────────────────────

// Weekly data refresh: spawn the pipeline so ghost runs (Phase 12) actually
// see new bars. Fresh data is what makes forward incubation forward.
function scheduleDataRefresh(): void {
  const expr = process.env.DATA_REFRESH_CRON;
  if (!expr) return;
  if (!cron.validate(expr)) {
    console.error(`[scheduler] DATA_REFRESH_CRON invalid: "${expr}" — data refresh off.`);
    return;
  }
  const script = path.resolve(process.cwd(), "packages/lean-engine/pipeline/download_data.py");
  cron.schedule(expr, () => {
    console.log(`[scheduler] data refresh starting @ ${new Date().toISOString()}`);
    const child = spawn("python", [script], { stdio: "ignore", shell: false });
    child.on("close", (code) =>
      console.log(`[scheduler] data refresh finished (exit ${code}) @ ${new Date().toISOString()}`)
    );
    child.on("error", (err) => console.error("[scheduler] data refresh failed to spawn:", err.message));
  });
  console.log(`[scheduler] data refresh scheduled: "${expr}"`);
}

// Nightly pg_dump (Phase 15). The trial ledger and gate history are the
// crown jewels; back them up before anything else gets scheduled.
function scheduleBackups(): void {
  const expr = process.env.BACKUP_CRON;
  if (!expr) return;
  if (!cron.validate(expr)) {
    console.error(`[scheduler] BACKUP_CRON invalid: "${expr}" — backups off.`);
    return;
  }
  cron.schedule(expr, async () => {
    const r = await runBackup();
    if (r.ok) {
      console.log(
        `[scheduler] backup ${r.file} (${r.bytes} bytes)` +
        (r.pruned?.length ? `; pruned ${r.pruned.length} old dump(s)` : "")
      );
    } else {
      console.error(`[scheduler] backup FAILED: ${r.error}`);
    }
  });
  console.log(`[scheduler] backups scheduled: "${expr}"`);
}

export function startScheduler(): void {
  scheduleBackups();
  scheduleDataRefresh();

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
