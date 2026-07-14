import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { runIncubationGhostRun, runAllIncubationGhostRuns } from "../services/incubation-runner";

// Davey Ch 23 — automated forward observation for incubating strategies.

export function registerIncubationRoutes(app: Express) {
  // POST /api/incubation/ghost-run — re-run incubating strategies' locked
  // code on current data and append new paper observations. Body optional
  // { strategyId } to target one. Long-running (spawns Docker per strategy).
  app.post("/api/incubation/ghost-run", async (req: Request, res: Response) => {
    try {
      const parsed = z.object({ strategyId: z.string().optional() }).safeParse(req.body ?? {});
      if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() });

      if (parsed.data.strategyId) {
        const result = await runIncubationGhostRun(parsed.data.strategyId);
        return res.json({ ran: result.status === "ran", results: [result] });
      }
      const batch = await runAllIncubationGhostRuns();
      res.json(batch);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/incubation/status — incubating strategies with observation
  // coverage, so a scheduler/UI can see who's due for a ghost run.
  app.get("/api/incubation/status", async (_req: Request, res: Response) => {
    try {
      const strategies = await storage.getStrategies();
      const rows = strategies
        .filter((s) => s.stage === "incubation")
        .map((s) => {
          const obs = s.incubationObservations ?? [];
          const dates = obs.map((o) => o.date).sort();
          const started = s.incubationStartedAt ? new Date(s.incubationStartedAt) : null;
          const elapsedDays = started
            ? Math.floor((Date.now() - started.getTime()) / 86400000)
            : null;
          return {
            id: s.id,
            name: s.name,
            leanProjectName: s.leanProjectName ?? null,
            hasBaseline: !!s.expectedPerformance,
            hasQuitRule: !!s.quitRule,
            requiredDays: s.requiredDays ?? 90,
            elapsedDays,
            startedAt: s.incubationStartedAt ?? null,
            observationCount: obs.length,
            lastObservation: dates[dates.length - 1] ?? null,
            ghostReady: !!s.leanProjectName && !!s.incubationStartedAt,
          };
        });
      res.json(rows);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });
}
