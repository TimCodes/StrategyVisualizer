import type { Express, Request, Response } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { insertStrategySchema, setGoalsBodySchema } from "@shared/schema";

const gateBodySchema = z.object({
  result: z.enum(["passed", "failed", "discarded"]),
  note: z.string().optional(),
});

export function registerStrategyRoutes(app: Express) {
  app.get("/api/strategies", async (_req: Request, res: Response) => {
    try {
      const strategies = await storage.getStrategies();
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch strategies" });
    }
  });

  app.get("/api/strategies/:id", async (req: Request, res: Response) => {
    try {
      const strategy = await storage.getStrategyById(req.params.id);
      if (!strategy) {
        return res.status(404).json({ error: "Strategy not found" });
      }
      res.json(strategy);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch strategy" });
    }
  });

  app.post("/api/strategies", async (req: Request, res: Response) => {
    try {
      const parsed = insertStrategySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const strategy = await storage.createStrategy(parsed.data);
      res.status(201).json(strategy);
    } catch (error) {
      res.status(500).json({ error: "Failed to create strategy" });
    }
  });

  app.patch("/api/strategies/:id", async (req: Request, res: Response) => {
    try {
      const parsed = insertStrategySchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const strategy = await storage.updateStrategy(req.params.id, parsed.data);
      res.json(strategy);
    } catch (error) {
      if ((error as Error).message === "Strategy not found") {
        return res.status(404).json({ error: "Strategy not found" });
      }
      res.status(500).json({ error: "Failed to update strategy" });
    }
  });

  app.delete("/api/strategies/:id", async (req: Request, res: Response) => {
    try {
      await storage.deleteStrategy(req.params.id);
      res.status(204).send();
    } catch (error) {
      if ((error as Error).message === "Strategy not found") {
        return res.status(404).json({ error: "Strategy not found" });
      }
      res.status(500).json({ error: "Failed to delete strategy" });
    }
  });

  // Lock goals — once, at the idea stage only (Davey Ch 9). The generic
  // PATCH strips `goals`, so this is the only mutation path.
  app.post("/api/strategies/:id/goals", async (req: Request, res: Response) => {
    try {
      const parsed = setGoalsBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const strategy = await storage.setStrategyGoals(req.params.id, parsed.data);
      res.json(strategy);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === "Strategy not found") {
        return res.status(404).json({ error: msg });
      }
      if (msg === "Goals already locked" || msg === "Goals can only be set at the idea stage") {
        return res.status(409).json({ error: msg });
      }
      res.status(500).json({ error: "Failed to set goals" });
    }
  });

  app.post("/api/strategies/:id/gate", async (req: Request, res: Response) => {
    try {
      const parsed = gateBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body", details: parsed.error.errors });
      }
      const strategy = await storage.recordGate(req.params.id, parsed.data);
      res.json(strategy);
    } catch (error) {
      const msg = (error as Error).message;
      if (msg === "Strategy not found") {
        return res.status(404).json({ error: msg });
      }
      if (msg.startsWith("Cannot go live:")) {
        return res.status(409).json({ error: msg });
      }
      res.status(500).json({ error: "Failed to record gate transition" });
    }
  });
}
