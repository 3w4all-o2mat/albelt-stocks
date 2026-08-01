import { SignJWT, jwtVerify } from "jose";

/**
 * Public payload stored inside the JWT / exposed to the client.
 * Never put sensitive data (password hashes, etc.) here.
 */
export interface SessionUser {
  id: number;
  username: string;
  role: "master" | "manager" | "user";
}

const COOKIE_NAME = "albelt_session";
const ISSUER = "albelt-stocks";
const AUDIENCE = "albelt-stocks";

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET (or SESSION_SECRET) is not set. Configure .env.local"
    );
  }
  return new TextEncoder().encode(secret);
}

function getExpiry(): string {
  return process.env.JWT_EXPIRY ?? "8h";
}

/**
 * Sign a JWT containing the session user and set it as an httpOnly cookie
 * on the provided response.
 */
export async function issueSession(
  user: SessionUser,
  res: Response
): Promise<void> {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setExpirationTime(getExpiry())
    .sign(getSecret());

  setCookie(res, token);
}

/**
 * Re-issue a session cookie with the same user (e.g. after profile edits
 * that should refresh the client-side role/identity).
 */
export async function refreshSession(
  user: SessionUser,
  res: Response
): Promise<void> {
  await issueSession(user, res);
}

/**
 * Clear the session cookie (logout).
 */
export function clearSession(res: Response): void {
  res.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
  );
}

function setCookie(res: Response, token: string): void {
  res.headers.append(
    "Set-Cookie",
    `${COOKIE_NAME}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(
      (parseExpirySeconds(getExpiry()))
    )}`
  );
}

function parseExpirySeconds(expiry: string): number {
  const m = /^(\d+)([smhd])?$/.exec(expiry.trim());
  if (!m) return 8 * 60 * 60;
  const n = Number(m[1]);
  switch (m[2]) {
    case "s":
      return n;
    case "m":
      return n * 60;
    case "h":
      return n * 60 * 60;
    case "d":
      return n * 60 * 60 * 24;
    default:
      return n;
  }
}

/**
 * Verify a raw JWT string and return the decoded user, or null if invalid.
 */
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const id = Number(payload.id);
    const username = String(payload.username ?? "");
    const role = payload.role as SessionUser["role"];
    if (!id || !username || !role) return null;
    if (!["master", "manager", "user"].includes(role)) return null;
    return { id, username, role };
  } catch {
    return null;
  }
}

export const SESSION_COOKIE = COOKIE_NAME;
