// ─────────────────────────────────────────────────────────────
//  Postgres backups (Phase 15).
//
//  The trial ledger and gate history are the crown jewels — they are
//  what makes every DSR/PBO claim honest. Everything else in the app
//  (market data, LEAN results) is re-derivable; the ledger is not.
//
//  Strategy: run pg_dump INSIDE the Postgres container (docker exec),
//  so no local Postgres client install is needed on the host. Dumps are
//  plain-SQL (portable across pg versions for this schema size) written
//  to BACKUP_DIR, pruned to the newest BACKUP_KEEP files.
//
//  Restore (documented in README):
//    docker exec -i praxis-postgres psql -U praxis -d praxis < backups/<file>.sql
// ─────────────────────────────────────────────────────────────

import { spawn } from "child_process";
import { promises as fs } from "fs";
import path from "path";

export interface BackupTarget {
  container: string;
  user: string;
  database: string;
}

export interface BackupInfo {
  file: string;
  bytes: number;
  createdAt: string;
}

export function backupDir(): string {
  return path.resolve(process.cwd(), process.env.BACKUP_DIR ?? "backups");
}

/**
 * Derive the dump target from DATABASE_URL + PG_CONTAINER.
 * Returns null when there is no database to back up (memory-only mode)
 * or the URL points at a managed host (neon etc. — use their tooling).
 */
export function resolveBackupTarget(
  databaseUrl = process.env.DATABASE_URL,
  container = process.env.PG_CONTAINER ?? "praxis-postgres"
): BackupTarget | { cannotBackup: string } {
  if (!databaseUrl) {
    return { cannotBackup: "No DATABASE_URL — app is running on in-memory storage; nothing durable to back up." };
  }
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    return { cannotBackup: "DATABASE_URL is not a parseable URL." };
  }
  const host = url.hostname;
  if (host !== "localhost" && host !== "127.0.0.1") {
    return {
      cannotBackup:
        `DATABASE_URL points at "${host}" — a managed/remote Postgres. ` +
        `Use the provider's backup tooling; docker-exec pg_dump only covers the local container.`,
    };
  }
  const database = url.pathname.replace(/^\//, "");
  if (!url.username || !database) {
    return { cannotBackup: "DATABASE_URL is missing a username or database name." };
  }
  return { container, user: url.username, database };
}

export function backupFilename(now = new Date()): string {
  const stamp = now.toISOString().replace(/[:T]/g, "-").replace(/\..+$/, "");
  return `praxis-${stamp}.sql`;
}

/** Newest-first listing of existing dumps. */
export async function listBackups(dir = backupDir()): Promise<BackupInfo[]> {
  let names: string[];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }
  const out: BackupInfo[] = [];
  for (const name of names) {
    if (!/^praxis-.*\.sql$/.test(name)) continue;
    const st = await fs.stat(path.join(dir, name));
    out.push({ file: name, bytes: st.size, createdAt: st.mtime.toISOString() });
  }
  return out.sort((a, b) => (a.file < b.file ? 1 : -1));
}

/** Delete all but the newest `keep` dumps. Returns the deleted filenames. */
export async function pruneBackups(keep: number, dir = backupDir()): Promise<string[]> {
  const backups = await listBackups(dir);
  const excess = backups.slice(Math.max(keep, 1));
  for (const b of excess) await fs.unlink(path.join(dir, b.file));
  return excess.map((b) => b.file);
}

function dockerPgDump(target: BackupTarget): Promise<{ sql: string } | { error: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      "docker",
      ["exec", target.container, "pg_dump", "-U", target.user, "-d", target.database, "--no-owner"],
      { shell: false }
    );
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", (e) => resolve({ error: `docker failed to spawn: ${e.message}` }));
    child.on("close", (code) => {
      if (code !== 0) resolve({ error: `pg_dump exited ${code}: ${err.trim().slice(0, 500)}` });
      else resolve({ sql: out });
    });
  });
}

export interface BackupRunResult {
  ok: boolean;
  file?: string;
  bytes?: number;
  pruned?: string[];
  error?: string;
}

export async function runBackup(): Promise<BackupRunResult> {
  const target = resolveBackupTarget();
  if ("cannotBackup" in target) return { ok: false, error: target.cannotBackup };

  const dumped = await dockerPgDump(target);
  if ("error" in dumped) return { ok: false, error: dumped.error };
  // A real dump of this schema is never tiny; guard against writing an
  // empty/garbage file over nothing.
  if (dumped.sql.length < 1000 || !dumped.sql.includes("PostgreSQL database dump")) {
    return { ok: false, error: `pg_dump output looks invalid (${dumped.sql.length} bytes) — not saved.` };
  }

  const dir = backupDir();
  await fs.mkdir(dir, { recursive: true });
  const file = backupFilename();
  await fs.writeFile(path.join(dir, file), dumped.sql, "utf8");

  const keep = parseInt(process.env.BACKUP_KEEP ?? "30", 10) || 30;
  const pruned = await pruneBackups(keep, dir);

  return { ok: true, file, bytes: Buffer.byteLength(dumped.sql), pruned };
}
