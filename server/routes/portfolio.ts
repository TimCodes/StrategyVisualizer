import type { Express, Request, Response } from "express";
import { storage } from "../storage";
import { dateRangeSchema } from "@shared/schema";

export function registerPortfolioRoutes(app: Express) {
  app.get("/api/portfolio/metrics", async (_req: Request, res: Response) => {
    try {
      const metrics = await storage.getPortfolioMetrics();
      res.json(metrics);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch portfolio metrics" });
    }
  });

  app.get("/api/portfolio/performance", async (req: Request, res: Response) => {
    try {
      let dateRange;
      if (req.query.start && req.query.end) {
        const parsed = dateRangeSchema.safeParse({
          start: new Date(req.query.start as string),
          end: new Date(req.query.end as string),
        });
        if (parsed.success) {
          dateRange = parsed.data;
        }
      }
      const performanceData = await storage.getPerformanceData(dateRange);
      res.json(performanceData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance data" });
    }
  });
}
