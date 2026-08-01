import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { findUserById, isEmailTaken, updateProfile } from "@/lib/queries/membership";
import { isValidEmail } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const user = await findUserById(auth.user.id);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data: user });
}

export async function PUT(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let body: { full_name?: string | null; email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const email = (body.email ?? "").trim();
  const full_name = body.full_name ? body.full_name.trim() : null;

  if (email && !isValidEmail(email)) {
    return NextResponse.json(
      { success: false, error: "Invalid email format" },
      { status: 400 }
    );
  }

  if (email) {
    const taken = await isEmailTaken(email, auth.user.id);
    if (taken) {
      return NextResponse.json(
        { success: false, error: "Email already in use" },
        { status: 409 }
      );
    }
  }

  const updated = await updateProfile(auth.user.id, { full_name, email });
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Failed to update profile" },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true, data: updated });
}
