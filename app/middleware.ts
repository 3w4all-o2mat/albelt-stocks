import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "albelt_session";
const ISSUER = "albelt-stocks";
const AUDIENCE = "albelt-stocks";

// Routes that don't require authentication.
const PUBLIC_ROUTES = ["/login", "/api/auth/login", "/api/auth/logout"];

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "JWT_SECRET (or SESSION_SECRET) is not set. Configure .env.local"
    );
  }
  return new TextEncoder().encode(secret);
}

async function readUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: ISSUER,
      audience: AUDIENCE,
    });
    const id = Number(payload.id);
    const username = String(payload.username ?? "");
    const role = payload.role as "master" | "manager" | "user";
    if (!id || !username || !role) return null;
    if (!["master", "manager", "user"].includes(role)) return null;
    return { id, username, role };
  } catch {
    return null;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public assets / Next internals through.
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  const user = await readUser(req);

  // Redirect already-authenticated users away from /login.
  if (pathname === "/login" && user) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const isPublic = PUBLIC_ROUTES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );

  if (!user && !isPublic) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Role-based protection for admin routes.
  if (pathname.startsWith("/admin") || pathname.startsWith("/api/admin")) {
    if (!user || user.role !== "master") {
      if (req.headers.get("accept")?.includes("application/json")) {
        return NextResponse.json(
          { success: false, error: "Insufficient permissions" },
          { status: 403 }
        );
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except static assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
