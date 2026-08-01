import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import {
  getUserPasswordHash,
  updatePassword,
} from "@/lib/queries/membership";
import { isValidPassword, verifyPassword } from "@/lib/auth/password";

export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let body: { current_password?: string; new_password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const currentPassword = body.current_password ?? "";
  const newPassword = body.new_password ?? "";

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { success: false, error: "Current and new password are required" },
      { status: 400 }
    );
  }

  if (!isValidPassword(newPassword)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Password must be at least 8 characters with one number and one special character",
      },
      { status: 400 }
    );
  }

  const hash = await getUserPasswordHash(auth.user.id);
  if (!hash) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }

  const matches = await verifyPassword(currentPassword, hash);
  if (!matches) {
    return NextResponse.json(
      { success: false, error: "Current password is incorrect" },
      { status: 401 }
    );
  }

  await updatePassword(auth.user.id, newPassword);
  return NextResponse.json({ success: true });
}
