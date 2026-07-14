// ─────────────────────────────────────────────────────────────
//  Outbound alert webhook (Phase 12) — optional, opt-in.
//
//  When ALERT_WEBHOOK_URL is set, quit-rule breaches and review-due
//  notices are POSTed there as JSON so incubation genuinely runs
//  unattended. Best-effort: a failed webhook never breaks a ghost run.
// ─────────────────────────────────────────────────────────────

export type AlertKind = "quit_rule_breached" | "review_due" | "ghost_run_error";

export interface Alert {
  kind: AlertKind;
  strategyId: string;
  strategyName: string;
  detail: string;
  at: string;
}

export async function sendAlert(alert: Alert): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) return;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: "praxis", ...alert }),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch (err) {
    console.warn(`[notify] webhook failed for ${alert.kind}:`, (err as Error).message);
  }
}
