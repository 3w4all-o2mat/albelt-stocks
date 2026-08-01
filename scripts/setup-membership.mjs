#!/usr/bin/env node
/**
 * Create the first master user (or update password/role of an existing one).
 *
 * Required env:
 *   DATABASE_URL      Postgres connection string
 *   ADMIN_USERNAME    default 'admin'
 *   ADMIN_PASSWORD    default 'admin'   ⚠️ CHANGE IMMEDIATELY AFTER FIRST LOGIN
 *   ADMIN_EMAIL       default 'admin@example.com'
 *   ADMIN_FULL_NAME   default 'Administrator'
 *
 * Idempotent: re-running with the same username updates password/role/email.
 */
import bcrypt from "bcryptjs";
import pg from "pg";

const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

const username    = process.env.ADMIN_USERNAME    ?? "admin";
const password    = process.env.ADMIN_PASSWORD    ?? "admin";
const email       = process.env.ADMIN_EMAIL       ?? "admin@example.com";
const fullName    = process.env.ADMIN_FULL_NAME   ?? "Administrator";

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is not set");
  process.exit(1);
}

const passwordHash = await bcrypt.hash(password, ROUNDS);

const sql = `
  INSERT INTO public.albelt_membership
    (username, password_hash, email, role, full_name, is_active, date_creation)
  VALUES ($1, $2, $3, 'master', $4, TRUE, NOW())
  ON CONFLICT (username) DO UPDATE
    SET password_hash = EXCLUDED.password_hash,
        email         = EXCLUDED.email,
        role          = 'master',
        full_name     = EXCLUDED.full_name,
        is_active     = TRUE
  RETURNING id, username, role, email;
`;

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
try {
  const { rows } = await pool.query(sql, [username, passwordHash, email, fullName]);
  console.log("✅ Master user ready:", rows[0]);
  if (password === "admin") {
    console.warn("⚠️  Default password is 'admin'. Change it after first login.");
  }
} catch (err) {
  console.error("❌ setup-membership failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
