import type { Express } from "express";
import { createServer, type Server } from "http";

export async function registerRoutes(app: Express): Promise<Server> {
  app.get("/api/packages", async (req, res) => {
    try {
      const packages = [
        {
          id: 1,
          name: "@poc/client",
          version: "1.0.0",
          status: "running",
          port: 3000,
          description: "React-based frontend application",
        },
        {
          id: 2,
          name: "@poc/server",
          version: "1.0.0",
          status: "running",
          port: 3001,
          description: "Express.js API server",
        },
        {
          id: 3,
          name: "@poc/core",
          version: "1.0.0",
          status: "built",
          port: null,
          description: "Shared utilities and types",
        },
      ];

      res.json({
        success: true,
        data: packages,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch packages",
        timestamp: new Date().toISOString(),
      });
    }
  });

  app.get("/api/structure", async (req, res) => {
    try {
      const structure = {
        root: "monorepo-poc",
        packages: [
          {
            name: "client",
            type: "frontend",
            dependencies: ["@poc/core", "react", "vite"],
            scripts: ["dev", "build", "preview"],
          },
          {
            name: "server",
            type: "backend",
            dependencies: ["@poc/core", "express", "cors"],
            scripts: ["dev", "build", "start"],
          },
          {
            name: "core",
            type: "library",
            dependencies: ["typescript"],
            scripts: ["build", "dev"],
          },
        ],
      };

      res.json({
        success: true,
        data: structure,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to fetch project structure",
        timestamp: new Date().toISOString(),
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
