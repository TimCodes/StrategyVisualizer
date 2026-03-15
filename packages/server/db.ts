import * as schema from "@shared/schema";

type DrizzleDB = ReturnType<typeof import("drizzle-orm/neon-serverless").drizzle<typeof schema>>;

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
    const { Pool } = await import("@neondatabase/serverless");
    const { drizzle } = await import("drizzle-orm/neon-serverless");
    
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    db = drizzle(pool, { schema });
    console.log("Database connection established");
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
