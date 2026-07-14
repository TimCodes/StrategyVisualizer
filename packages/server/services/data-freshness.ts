import { promises as fs } from "fs";
import path from "path";

// ─────────────────────────────────────────────────────────────
//  Data freshness (Phase 13)
//
//  Reads the pipeline's provenance.json and reports how stale the
//  local market data is. Surfaced on /api/system/status so a stale
//  dataset warns loudly — a backtest on last month's data quietly
//  answers a different question than the one you asked.
// ─────────────────────────────────────────────────────────────

export interface DataFreshness {
  available: boolean;
  refreshedAt: string | null;
  /** Most recent coverage `last` date across all symbols */
  lastCoverage: string | null;
  /** Calendar days between lastCoverage and today */
  coverageStaleDays: number | null;
  /** Calendar days since the pipeline was last run */
  refreshAgeDays: number | null;
  stale: boolean;
  symbolCount: number;
  note: string;
}

// Generous thresholds absorb weekends + market holidays; the point is to
// catch "forgot to refresh for weeks", not a 3-day-weekend gap.
const COVERAGE_STALE_DAYS = 5;
const REFRESH_STALE_DAYS = 8;

function daysBetween(fromIso: string, to = new Date()): number {
  const from = new Date(fromIso).getTime();
  if (!isFinite(from)) return NaN;
  return Math.floor((to.getTime() - from) / 86400000);
}

export async function getDataFreshness(): Promise<DataFreshness> {
  const workspace = process.env.LEAN_WORKSPACE_DIR ?? "./lean-workspace";
  const file = path.join(workspace, "data", "provenance.json");

  let raw: string;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch {
    return {
      available: false, refreshedAt: null, lastCoverage: null,
      coverageStaleDays: null, refreshAgeDays: null, stale: true,
      symbolCount: 0, note: "No provenance.json — run the data pipeline (npm run data:refresh).",
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      available: false, refreshedAt: null, lastCoverage: null,
      coverageStaleDays: null, refreshAgeDays: null, stale: true,
      symbolCount: 0, note: "provenance.json is unreadable.",
    };
  }

  const symbols = parsed.symbols ?? {};
  const lasts = Object.values(symbols)
    .map((s: any) => s?.last)
    .filter((d: any): d is string => typeof d === "string")
    .sort();
  const lastCoverage = lasts.length ? lasts[lasts.length - 1] : null;

  // refreshed is "YYYY-MM-DD HH:MM UTC" — normalize to something Date parses
  const refreshedAt: string | null = parsed.refreshed ?? null;
  const refreshIso = refreshedAt ? refreshedAt.replace(" ", "T").replace(" UTC", "Z") : null;

  const coverageStaleDays = lastCoverage ? daysBetween(lastCoverage) : null;
  const refreshAgeDays = refreshIso ? daysBetween(refreshIso) : null;

  const stale =
    (coverageStaleDays != null && coverageStaleDays > COVERAGE_STALE_DAYS) ||
    (refreshAgeDays != null && refreshAgeDays > REFRESH_STALE_DAYS);

  return {
    available: true,
    refreshedAt,
    lastCoverage,
    coverageStaleDays,
    refreshAgeDays,
    stale,
    symbolCount: Object.keys(symbols).length,
    note: stale
      ? `Data is stale (coverage ${coverageStaleDays}d behind, refreshed ${refreshAgeDays}d ago). Run npm run data:refresh before trusting a backtest.`
      : "Data is fresh.",
  };
}
