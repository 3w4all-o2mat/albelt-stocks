import { cookies } from "next/headers";
import { SESSION_COOKIE, verifyToken, type SessionUser } from "./session";

/**
 * Read the current session user from the request cookies.
 * Intended for Server Components / Server Actions only.
 * Returns null when there is no valid session.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifyToken(token);
}
