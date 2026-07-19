import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import os from "os";
import {
  resolveBackupTarget,
  backupFilename,
  listBackups,
  pruneBackups,
} from "../backup";

describe("resolveBackupTarget", () => {
  it("parses a local DATABASE_URL into container/user/database", () => {
    const t = resolveBackupTarget("postgresql://praxis:pw@localhost:5434/praxis");
    expect(t).toEqual({ container: "praxis-postgres", user: "praxis", database: "praxis" });
  });

  it("honors PG_CONTAINER override", () => {
    const t = resolveBackupTarget("postgresql://u:p@127.0.0.1:5432/db", "other-pg");
    expect(t).toEqual({ container: "other-pg", user: "u", database: "db" });
  });

  it("refuses when there is no DATABASE_URL (memory mode)", () => {
    const t = resolveBackupTarget(undefined);
    expect(t).toHaveProperty("cannotBackup");
    expect((t as any).cannotBackup).toMatch(/in-memory/);
  });

  it("refuses managed/remote hosts — provider tooling territory", () => {
    const t = resolveBackupTarget("postgresql://u:p@ep-cool-name.us-east-2.aws.neon.tech/neondb");
    expect(t).toHaveProperty("cannotBackup");
    expect((t as any).cannotBackup).toMatch(/managed|remote/);
  });

  it("refuses garbage URLs and missing user/db", () => {
    expect(resolveBackupTarget("not a url")).toHaveProperty("cannotBackup");
    expect(resolveBackupTarget("postgresql://localhost:5434/")).toHaveProperty("cannotBackup");
  });
});

describe("backupFilename", () => {
  it("is sortable, stamped, and .sql", () => {
    const f = backupFilename(new Date("2026-07-18T03:00:05Z"));
    expect(f).toBe("praxis-2026-07-18-03-00-05.sql");
  });
});

describe("listBackups / pruneBackups", () => {
  let dir: string;
  beforeEach(async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "praxis-backup-test-"));
  });
  afterEach(async () => {
    await fs.rm(dir, { recursive: true, force: true });
  });

  async function seed(names: string[]) {
    for (const n of names) await fs.writeFile(path.join(dir, n), `-- ${n}`);
  }

  it("lists only praxis dumps, newest first by filename stamp", async () => {
    await seed([
      "praxis-2026-07-16-02-00-00.sql",
      "praxis-2026-07-18-02-00-00.sql",
      "praxis-2026-07-17-02-00-00.sql",
      "unrelated.txt",
      "praxis-notes.md",
    ]);
    const list = await listBackups(dir);
    expect(list.map((b) => b.file)).toEqual([
      "praxis-2026-07-18-02-00-00.sql",
      "praxis-2026-07-17-02-00-00.sql",
      "praxis-2026-07-16-02-00-00.sql",
    ]);
    expect(list[0].bytes).toBeGreaterThan(0);
  });

  it("returns empty for a missing directory", async () => {
    expect(await listBackups(path.join(dir, "nope"))).toEqual([]);
  });

  it("prunes to the newest N, deleting the oldest", async () => {
    await seed([
      "praxis-2026-07-15-02-00-00.sql",
      "praxis-2026-07-16-02-00-00.sql",
      "praxis-2026-07-17-02-00-00.sql",
      "praxis-2026-07-18-02-00-00.sql",
    ]);
    const deleted = await pruneBackups(2, dir);
    expect(deleted.sort()).toEqual([
      "praxis-2026-07-15-02-00-00.sql",
      "praxis-2026-07-16-02-00-00.sql",
    ]);
    const remaining = await listBackups(dir);
    expect(remaining).toHaveLength(2);
    expect(remaining[0].file).toBe("praxis-2026-07-18-02-00-00.sql");
  });

  it("never prunes below 1 even with keep=0", async () => {
    await seed(["praxis-2026-07-17-02-00-00.sql", "praxis-2026-07-18-02-00-00.sql"]);
    await pruneBackups(0, dir);
    expect(await listBackups(dir)).toHaveLength(1);
  });
});
