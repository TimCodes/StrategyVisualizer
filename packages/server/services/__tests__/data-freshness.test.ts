import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { getDataFreshness } from "../data-freshness";

const dirs: string[] = [];

async function makeWorkspace(provenance: unknown | null): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "praxis-fresh-"));
  dirs.push(root);
  if (provenance !== null) {
    await fs.mkdir(path.join(root, "data"), { recursive: true });
    await fs.writeFile(path.join(root, "data", "provenance.json"), JSON.stringify(provenance));
  }
  process.env.LEAN_WORKSPACE_DIR = root;
  return root;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

afterEach(async () => {
  delete process.env.LEAN_WORKSPACE_DIR;
  for (const d of dirs.splice(0)) await fs.rm(d, { recursive: true, force: true });
});

describe("getDataFreshness", () => {
  it("reports unavailable + stale when provenance is missing", async () => {
    await makeWorkspace(null);
    const f = await getDataFreshness();
    expect(f.available).toBe(false);
    expect(f.stale).toBe(true);
    expect(f.note).toMatch(/data:refresh/);
  });

  it("is fresh when coverage and refresh are recent", async () => {
    await makeWorkspace({
      refreshed: `${daysAgo(1)} 00:00 UTC`,
      symbols: { SPY: { last: daysAgo(2) }, BTCUSD: { last: daysAgo(1) } },
    });
    const f = await getDataFreshness();
    expect(f.available).toBe(true);
    expect(f.stale).toBe(false);
    expect(f.lastCoverage).toBe(daysAgo(1)); // max across symbols
    expect(f.symbolCount).toBe(2);
  });

  it("is stale when coverage is well behind today", async () => {
    await makeWorkspace({
      refreshed: `${daysAgo(1)} 00:00 UTC`,
      symbols: { SPY: { last: daysAgo(20) } },
    });
    const f = await getDataFreshness();
    expect(f.stale).toBe(true);
    expect(f.coverageStaleDays).toBeGreaterThan(5);
    expect(f.note).toMatch(/stale/i);
  });

  it("is stale when the pipeline hasn't run in over a week", async () => {
    await makeWorkspace({
      refreshed: `${daysAgo(12)} 00:00 UTC`,
      symbols: { SPY: { last: daysAgo(1) } }, // coverage fresh, refresh old
    });
    const f = await getDataFreshness();
    expect(f.stale).toBe(true);
    expect(f.refreshAgeDays).toBeGreaterThan(8);
  });

  it("handles a garbage provenance file gracefully", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "praxis-fresh-"));
    dirs.push(root);
    await fs.mkdir(path.join(root, "data"), { recursive: true });
    await fs.writeFile(path.join(root, "data", "provenance.json"), "{not json");
    process.env.LEAN_WORKSPACE_DIR = root;
    const f = await getDataFreshness();
    expect(f.available).toBe(false);
    expect(f.stale).toBe(true);
  });
});
