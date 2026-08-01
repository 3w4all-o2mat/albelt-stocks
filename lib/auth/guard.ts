import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifyToken, type SessionUser } from "./session";

export type Role = SessionUser["role"];

export interface AuthResult {
  user: SessionUser;
}

function unauthorized(message = "Authentication required") {
  return NextResponse.json({ success: false, error: message }, { status: 401 });
}

function forbidden(message = "Insufficient permissions") {
  return NextResponse.json({ success: false, error: message }, { status: 403 });
}

function readCookie(req: Request): string | null {
  const header = req.headers.get("cookie");
  if (!header) return null;
  const match = header
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
}

/**
 * Read the session user from the request cookie.
 * Returns null when there is no valid session.
 */
export async function getSessionUser(req: Request): Promise<SessionUser | null> {
  const token = readCookie(req);
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Route-handler guard: any authenticated user.
 * On success returns { user }. On failure returns a NextResponse (401).
 */
export async function requireAuth(
  req: Request
): Promise<AuthResult | NextResponse> {
  const user = await getSessionUser(req);
  if (!user) return unauthorized();
  return { user };
}

/**
 * Route-handler guard: authenticated user whose role is in `roles`.
 * On failure returns 401 (no session) or 403 (wrong role).
 */
export async function requireRole(
  req: Request,
  roles: Role[]
): Promise<AuthResult | NextResponse> {
  const result = await requireAuth(req);
  if (result instanceof NextResponse) return result;
  if (!roles.includes(result.user.role)) return forbidden();
  return result;
}

/**
 * Page-level guard for Server Components.
 * Verifies the session cookie and redirects to /login if not authenticated.
 */
export async function requirePageAuth(): Promise<SessionUser> {
  const cookieHeader = headers().get("cookie") ?? "";
  const match = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`));
  if (!match) redirect("/login");
  const token = decodeURIComponent(match.slice(SESSION_COOKIE.length + 1));
  const user = await verifyToken(token);
  if (!user) redirect("/login");
  return user;
}
