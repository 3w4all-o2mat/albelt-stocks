#!/usr/bin/env node
/**
 * Apply db/full-schema.sql against $DATABASE_URL.
 *
 * The schema file is idempotent (IF NOT EXISTS / ON CONFLICT) so it is safe
 * to re-run on every deploy.
 *
 * Usage:
 *   node scripts/apply-all-migrations.mjs            # uses DATABASE_URL
 *   psql "$DATABASE_URL" -f db/full-schema.sql       # equivalent one-liner
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const here = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(here, "..", "db", "full-schema.sql");

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const sql = readFileSync(sqlPath, "utf8");
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

try {
  console.log(`Applying ${sqlPath} (${sql.length} bytes) ...`);
  await pool.query(sql);
  console.log("✅ Schema applied");
} catch (err) {
  console.error("❌ Migration failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
