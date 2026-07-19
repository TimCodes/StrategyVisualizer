import * as schema from "@shared/schema";

// Both drivers expose the same drizzle query API; we type against the
// node-postgres variant and cast the Neon one to it.
type DrizzleDB = ReturnType<typeof import("drizzle-orm/node-postgres").drizzle<typeof schema>>;

let db: DrizzleDB | null = null;
let initPromise: Promise<DrizzleDB | null> | null = null;
let failedAtTime = 0;
let loggedNoDatabaseUrl = false;
const RETRY_INTERVAL_MS = 5000;

async function initializeDb(): Promise<DrizzleDB | null> {
  if (!process.env.DATABASE_URL) {
    if (!loggedNoDatabaseUrl) {
      console.log("DATABASE_URL not set, using in-memory storage for settings");
      loggedNoDatabaseUrl = true;
    }
    failedAtTime = Date.now();
    return null;
  }

  loggedNoDatabaseUrl = false;

  try {
    const url = process.env.DATABASE_URL;
    if (/neon\.tech/.test(url)) {
      // Neon serverless (cloud Postgres): WebSocket-based driver
      const { Pool } = await import("@neondatabase/serverless");
      const { drizzle } = await import("drizzle-orm/neon-serverless");
      db = drizzle(new Pool({ connectionString: url }), { schema }) as unknown as DrizzleDB;
      console.log("Database connection established (neon-serverless)");
    } else {
      // Plain Postgres (local Docker, self-hosted): TCP driver.
      // pg.Pool construction does NO network I/O — ping before declaring
      // victory, or the app silently runs on memory while claiming a db.
      const pg = await import("pg");
      const { drizzle } = await import("drizzle-orm/node-postgres");
      const pool = new pg.default.Pool({ connectionString: url });
      await pool.query("SELECT 1");
      db = drizzle(pool, { schema });
      console.log("Database connection established (node-postgres)");
    }
    failedAtTime = 0;
    return db;
  } catch (error) {
    console.error("Failed to initialize database connection:", error);
    failedAtTime = Date.now();
    return null;
  }
}

export async function getDb(): Promise<DrizzleDB | null> {
  if (db) {
    return db;
  }

  if (initPromise) {
    return initPromise;
  }

  const now = Date.now();
  if (failedAtTime > 0 && (now - failedAtTime) < RETRY_INTERVAL_MS) {
    return null;
  }

  initPromise = initializeDb();
  const result = await initPromise;
  initPromise = null;
  
  return result;
}

getDb();
