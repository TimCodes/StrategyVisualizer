---
name: Storage try/catch patterns
description: Two distinct patterns coexist in MemStorage — which to use depends on whether data needs persistence or just resilience.
---

## Pattern A — Map-first (trials, gate results, etc.)
Write to Map first, then attempt DB in a try/catch. Used where in-flight data must never be lost even if DB is unreachable.

```typescript
async recordSomething(data): Promise<Thing> {
  const record = { ...data, id: randomUUID() };
  this.things.set(record.id, record);  // always set in-memory first
  try {
    const db = await getDb();
    if (db) {
      const [row] = await db.insert(table).values(data).returning();
      if (row) { this.things.set(row.id, row); return row; }
    }
  } catch { /* fall through */ }
  return record;
}
```

## Pattern B — DB-first (strategies)
Try DB inside a full try/catch; fall through to Map on any error. Used where DB is the source of truth and the Map is a warm seed/fallback.

```typescript
async getStrategies(): Promise<Strategy[]> {
  try {
    const db = await getDb();
    if (db) {
      const rows = await db.select().from(strategiesTable);
      return rows.map(mapDbStrategy);
    }
  } catch {
    // Neon WebSocket failed — fall through to Map
  }
  return Array.from(this.strategies.values());
}
```

**Why:** The Neon serverless driver returns a client object immediately (getDb() resolves) but the actual WebSocket only opens when a query runs. `getDb().catch(() => null)` does NOT catch query-time WebSocket errors — the query itself must be inside try/catch.

**Key pitfall:** `getDb().catch(() => null)` then `await db.query()` is WRONG — the query can throw even when db is non-null. Always wrap the entire block.

**Re-throw "not found":** Write methods that check existence must re-throw `"Strategy not found"` through the catch so callers get 404 not a silent Map miss:
```typescript
} catch (err) {
  if ((err as Error).message === "Strategy not found") throw err;
  // DB connection error — fall through to Map
}
```
