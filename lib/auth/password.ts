import bcrypt from "bcryptjs";

const ROUNDS = Number(process.env.BCRYPT_ROUNDS ?? 12);

/**
 * Hash a plain-text password using bcryptjs.
 */
export async function hashPassword(plain: string): Promise<string> {
  if (!plain) throw new Error("Password must not be empty");
  return bcrypt.hash(plain, ROUNDS);
}

/**
 * Verify a plain-text password against a stored bcrypt hash.
 * Constant-time comparison is handled by bcryptjs internally.
 */
export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  if (!plain || !hash) return false;
  return bcrypt.compare(plain, hash);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validate an email format. Uniqueness must be checked against the DB separately.
 */
export function isValidEmail(email: string): boolean {
  return EMAIL_RE.test(email);
}

/**
 * Password policy: min 8 chars, at least one number and one special character.
 */
export function isValidPassword(password: string): boolean {
  if (password.length < 8) return false;
  if (!/\d/.test(password)) return false;
  if (!/[^A-Za-z0-9]/.test(password)) return false;
  return true;
}
