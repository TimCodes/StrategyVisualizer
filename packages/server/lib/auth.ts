import crypto from "crypto";
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";

// ─────────────────────────────────────────────────────────────
//  Phase 8 — single-user session auth.
//
//  Modes:
//   - AUTH_ENABLED unset/false → open (local development, current behavior)
//   - AUTH_ENABLED === "true"  → every /api route requires a session,
//     except /api/auth/* and GET /api/system/status.
//
//  Fail-closed on misconfiguration: if auth is enabled but AUTH_PASSWORD
//  or SESSION_SECRET is missing, the API refuses requests (503) instead
//  of silently running open.
//
//  Going live REQUIRES auth: the strategy state machine blocks the
//  → live transition while auth is disabled (see storage.recordGate).
// ─────────────────────────────────────────────────────────────

export function isAuthEnabled(): boolean {
  return process.env.AUTH_ENABLED === "true";
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_PASSWORD) && Boolean(process.env.SESSION_SECRET);
}

/** Constant-time password comparison (padded to equal length). */
export function verifyPassword(supplied: string, expected: string): boolean {
  const a = Buffer.from(supplied.padEnd(256, "\0").slice(0, 256));
  const b = Buffer.from(expected.padEnd(256, "\0").slice(0, 256));
  return supplied.length === expected.length && crypto.timingSafeEqual(a, b);
}

declare module "express-session" {
  interface SessionData {
    authenticated?: boolean;
  }
}

export async function setupAuth(app: Express): Promise<void> {
  if (!isAuthEnabled()) {
    // Open mode: still expose /api/auth/me so the client can render state.
    app.get("/api/auth/me", (_req, res) =>
      res.json({ authEnabled: false, authenticated: true })
    );
    return;
  }

  if (!isAuthConfigured()) {
    console.error(
      "AUTH_ENABLED=true but AUTH_PASSWORD or SESSION_SECRET is missing — refusing all API requests."
    );
    app.use("/api", (_req: Request, res: Response) =>
      res.status(503).json({
        error: "Auth is enabled but misconfigured: set AUTH_PASSWORD and SESSION_SECRET.",
      })
    );
    return;
  }

  // Session store: Postgres when available (sessions survive restarts),
  // in-memory otherwise (dev only — logged so nobody mistakes it).
  let store: session.Store | undefined;
  if (process.env.DATABASE_URL && !/neon\.tech/.test(process.env.DATABASE_URL)) {
    const pg = await import("pg");
    const connectPgSimple = (await import("connect-pg-simple")).default;
    const PgStore = connectPgSimple(session);
    store = new PgStore({
      pool: new pg.default.Pool({ connectionString: process.env.DATABASE_URL }),
      createTableIfMissing: true,
    });
    console.log("Auth: session store = postgres");
  } else {
    console.log("Auth: session store = memory (sessions reset on restart)");
  }

  app.set("trust proxy", 1);
  app.use(
    session({
      name: "praxis.sid",
      secret: process.env.SESSION_SECRET as string,
      store,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 7 * 24 * 3600 * 1000,
      },
    })
  );

  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many login attempts; try again later." },
  });

  app.post("/api/auth/login", loginLimiter, (req: Request, res: Response) => {
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    if (!verifyPassword(password, process.env.AUTH_PASSWORD as string)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    req.session.authenticated = true;
    res.json({ authenticated: true });
  });

  app.post("/api/auth/logout", (req: Request, res: Response) => {
    req.session.destroy(() => res.json({ authenticated: false }));
  });

  app.get("/api/auth/me", (req: Request, res: Response) => {
    res.json({ authEnabled: true, authenticated: req.session.authenticated === true });
  });

  // The gate: everything else under /api requires a session.
  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/auth/")) return next();
    if (req.path === "/system/status" && req.method === "GET") return next();
    if (req.session?.authenticated === true) return next();
    res.status(401).json({ error: "Authentication required" });
  });
}

// ── Rate limits for expensive/dangerous endpoints ────────────
// Applied regardless of auth mode: LLM endpoints cost money per call and
// order endpoints act on broker accounts.

export function setupRateLimits(app: Express): void {
  const llmLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "LLM rate limit: 20 requests/minute." },
  });
  const orderLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Order rate limit: 10 requests/minute." },
  });

  app.use(["/api/chat", "/api/arena", "/api/lean/agent"], llmLimiter);
  app.use(["/api/ibkr/order", "/api/kraken/order"], orderLimiter);
}
