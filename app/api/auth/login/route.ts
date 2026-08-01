import { NextResponse } from "next/server";
import { findUserByUsernameForLogin } from "@/lib/queries/membership";
import { verifyPassword } from "@/lib/auth/password";
import { issueSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const username = (body.username ?? "").trim();
  const password = body.password ?? "";

  if (!username || !password) {
    // Generic error — do not hint which field is wrong.
    return NextResponse.json(
      { success: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const user = await findUserByUsernameForLogin(username);
  // Always run a compare even if the user doesn't exist to keep timing
  // roughly constant and avoid user enumeration.
  const ok = user
    ? await verifyPassword(password, user.password_hash)
    : await verifyPassword(password, "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvali");

  if (!user || !user.is_active || !ok) {
    return NextResponse.json(
      { success: false, error: "Invalid credentials" },
      { status: 401 }
    );
  }

  const res = NextResponse.json({
    success: true,
    data: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
  await issueSession(
    { id: user.id, username: user.username, role: user.role },
    res
  );
  return res;
}
