import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { setQuitRuleBodySchema, insertStrategyReviewSchema } from "@shared/schema";
import { buildTrackingReport, reviewDue, REVIEW_INTERVAL_DAYS } from "../services/monitoring";

// Davey Ch 23–24: the "How We Doin'" report and per-strategy drill-down.

export function registerMonitoringRoutes(app: Express) {
  // GET /api/monitoring/summary — every incubating/live strategy with its
  // efficiencies, band position, quit-rule status, and review due-ness.
  app.get("/api/monitoring/summary", async (_req: Request, res: Response) => {
    try {
      const strategies = await storage.getStrategies();
      const monitored = strategies.filter(
        (s) => s.stage === "incubation" || s.stage === "live"
      );
      const rows = await Promise.all(
        monitored.map(async (s) => {
          const tracking = s.expectedPerformance ? buildTrackingReport(s) : null;
          const reviews = await storage.getStrategyReviews(s.id);
          const lastReview = reviews[0]?.createdAt ?? null;
          const stageEnteredAt =
            [...s.gateHistory].reverse().find((g) => g.result === "passed")?.at ??
            s.incubationStartedAt ??
            null;
          const t = tracking && !("error" in tracking) ? tracking : null;
          return {
            id: s.id,
            name: s.name,
            stage: s.stage,
            gateStatus: s.gateStatus,
            observationCount: (s.incubationObservations ?? []).length,
            cumulativePnL: t?.cumulativePnL ?? null,
            bandPosition: t?.bandPosition ?? null,
            returnEfficiency: t?.returnEfficiency ?? null,
            drawdownEfficiency: t?.drawdownEfficiency ?? null,
            warnings: t?.warnings ?? (tracking && "error" in tracking ? [tracking.error] : []),
            quitRuleBreached: t?.quitRuleStatus?.breached ?? false,
            hasQuitRule: !!s.quitRule,
            hasBaseline: !!s.expectedPerformance,
            lastReviewAt: lastReview,
            reviewDue: reviewDue(lastReview, stageEnteredAt),
            reviewIntervalDays: REVIEW_INTERVAL_DAYS,
          };
        })
      );
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/strategies/:id/monitoring — full tracking detail
  app.get("/api/strategies/:id/monitoring", async (req: Request, res: Response) => {
    try {
      const strategy = await storage.getStrategyById(req.params.id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });
      const tracking = buildTrackingReport(strategy);
      if ("error" in tracking) return res.status(400).json({ error: tracking.error });
      const reviews = await storage.getStrategyReviews(strategy.id);
      res.json({
        strategyId: strategy.id,
        name: strategy.name,
        stage: strategy.stage,
        expectedPerformance: strategy.expectedPerformance,
        quitRule: strategy.quitRule ?? null,
        tracking,
        reviews,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/strategies/:id/quit-rule — lock once, before going live
  app.post("/api/strategies/:id/quit-rule", async (req: Request, res: Response) => {
    try {
      const parsed = setQuitRuleBodySchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const strategy = await storage.setQuitRule(req.params.id, parsed.data);
      res.json(strategy);
    } catch (err: any) {
      const msg = err.message;
      if (msg === "Strategy not found") return res.status(404).json({ error: msg });
      if (msg === "Quit rule already locked" || msg === "Quit rule must be locked before going live") {
        return res.status(409).json({ error: msg });
      }
      res.status(500).json({ error: msg });
    }
  });

  // POST /api/strategies/:id/reviews — Davey's standing review questions
  app.post("/api/strategies/:id/reviews", async (req: Request, res: Response) => {
    try {
      const strategy = await storage.getStrategyById(req.params.id);
      if (!strategy) return res.status(404).json({ error: "Strategy not found" });
      const parsed = insertStrategyReviewSchema
        .omit({ strategyId: true })
        .safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });
      const review = await storage.createStrategyReview({
        ...parsed.data,
        strategyId: strategy.id,
      });
      res.status(201).json(review);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/strategies/:id/reviews
  app.get("/api/strategies/:id/reviews", async (req: Request, res: Response) => {
    try {
      res.json(await storage.getStrategyReviews(req.params.id));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
