// CLI for Postgres backup/restore without the app running.
//
//   npm run db:backup                      → new dump in backups/
//   npm run db:restore -- backups/<f>.sql  → restore that dump
//
// Restore DROPs and recreates the public schema first so the dump loads
// into a clean slate (otherwise COPY hits duplicate keys). It refuses to
// run unless the dump file passes the same sanity check as backup.

import { spawn } from "child_process";
import { promises as fs } from "fs";
import { createReadStream } from "fs";
import { runBackup, resolveBackupTarget } from "../services/backup";

function exec(args: string[], stdin?: NodeJS.ReadableStream): Promise<number> {
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { shell: false, stdio: [stdin ? "pipe" : "ignore", "inherit", "inherit"] });
    if (stdin && child.stdin) stdin.pipe(child.stdin);
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function main() {
  const [cmd, file] = process.argv.slice(2);

  if (!cmd || cmd === "backup") {
    const r = await runBackup();
    if (!r.ok) { console.error(`Backup failed: ${r.error}`); process.exit(1); }
    console.log(`Backup written: backups/${r.file} (${r.bytes} bytes)` +
      (r.pruned?.length ? `; pruned ${r.pruned.join(", ")}` : ""));
    return;
  }

  if (cmd === "restore") {
    if (!file) { console.error("Usage: npm run db:restore -- backups/<file>.sql"); process.exit(1); }
    const target = resolveBackupTarget();
    if ("cannotBackup" in target) { console.error(target.cannotBackup); process.exit(1); }

    const sql = await fs.readFile(file, "utf8");
    if (!sql.includes("PostgreSQL database dump")) {
      console.error(`${file} does not look like a pg_dump file — refusing to restore.`);
      process.exit(1);
    }

    console.log(`Restoring ${file} into ${target.database} (container ${target.container})…`);
    console.log("This DROPs the current public schema first. Ctrl+C within 5s to abort.");
    await new Promise((r) => setTimeout(r, 5000));

    let code = await exec([
      "exec", target.container, "psql", "-U", target.user, "-d", target.database,
      "-c", "DROP SCHEMA public CASCADE; CREATE SCHEMA public;",
    ]);
    if (code !== 0) { console.error("Schema reset failed."); process.exit(code); }

    code = await exec(
      ["exec", "-i", target.container, "psql", "-v", "ON_ERROR_STOP=1", "-U", target.user, "-d", target.database],
      createReadStream(file)
    );
    if (code !== 0) { console.error("Restore failed."); process.exit(code); }
    console.log("Restore complete. Restart the app so the pool reconnects cleanly.");
    return;
  }

  console.error(`Unknown command "${cmd}". Use: backup | restore <file>`);
  process.exit(1);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
