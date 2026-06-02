---
name: Storage try/catch in-memory-first pattern
description: All MemStorage methods must do in-memory first, then attempt DB in a try/catch.
---

**Rule:** Every storage method must:
1. Do the in-memory operation first (set/get from the Map or array).
2. In a `try { ... } catch { // fall through }` block, attempt the DB operation.
3. If DB succeeds, update the in-memory copy and return the DB row.
4. If DB throws, silently fall through and return the already-set in-memory copy.

**Why:** The Neon serverless WebSocket connection throws on cold starts and intermittently under load. The app uses `getDb()` which can return `null` or throw. Doing in-memory first means the app is always functional even if the DB is unavailable.

**Pattern (correct):**
```typescript
async recordGateResult(data): Promise<GateResult> {
  const record = { ...data, id: randomUUID(), computedAt: new Date() };
  this.gateResults.set(record.id, record);  // in-memory first
  try {
    const db = await getDb();
    if (db) {
      const [row] = await db.insert(gateResultsTable).values(data).returning();
      if (row) { this.gateResults.set(row.id, row); return row; }
    }
  } catch { /* fall through */ }
  return record;
}
```

**Do NOT** do DB first and fall back — the DB error would lose the write entirely if in-memory is not pre-set.
