import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import {
  deleteUser,
  findUserById,
  isEmailTaken,
  updateUser,
} from "@/lib/queries/membership";
import { isValidEmail, isValidPassword } from "@/lib/auth/password";
import type { MembershipRole, UpdateUserInput } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_ROLES: MembershipRole[] = ["master", "manager", "user"];

function parseAtelierIds(value: unknown): number[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) return [];
  return value
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function parseAtelierId(value: unknown): number | null | undefined {
  if (value === undefined || value === "") return undefined;
  if (value === null) return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateAtelierId(
  atelierId: number | null | undefined,
  atelierIds: number[] | undefined
): string | null {
  if (atelierId == null || atelierIds === undefined) return null;
  if (!atelierIds.includes(atelierId)) {
    return "Default atelier must be one of the assigned ateliers";
  }
  return null;
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid id" },
      { status: 400 }
    );
  }
  const user = await findUserById(id);
  if (!user) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data: user });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid id" },
      { status: 400 }
    );
  }

  let body: Partial<UpdateUserInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  // Normalize atelier_id / atelier_ids before validation/persistence.
  body.atelier_ids = parseAtelierIds(body.atelier_ids);
  body.atelier_id = parseAtelierId(body.atelier_id);

  const atelierIdError = validateAtelierId(body.atelier_id, body.atelier_ids);
  if (atelierIdError) {
    return NextResponse.json(
      { success: false, error: atelierIdError },
      { status: 400 }
    );
  }

  const existing = await findUserById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }

  // A master cannot demote themselves (would lose admin access).
  if (
    auth.user.id === id &&
    body.role !== undefined &&
    body.role !== "master"
  ) {
    return NextResponse.json(
      { success: false, error: "You cannot demote your own master account" },
      { status: 400 }
    );
  }
  if (
    auth.user.id === id &&
    body.is_active === false
  ) {
    return NextResponse.json(
      { success: false, error: "You cannot deactivate your own account" },
      { status: 400 }
    );
  }

  if (body.email !== undefined) {
    const email = body.email.trim();
    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }
    if (await isEmailTaken(email, id)) {
      return NextResponse.json(
        { success: false, error: "Email already in use" },
        { status: 409 }
      );
    }
    body.email = email;
  }

  if (body.role !== undefined && !VALID_ROLES.includes(body.role)) {
    return NextResponse.json(
      { success: false, error: "Invalid role" },
      { status: 400 }
    );
  }

  if (body.password && !isValidPassword(body.password)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Password must be at least 8 characters with one number and one special character",
      },
      { status: 400 }
    );
  }

  const updated = await updateUser(id, body);
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Failed to update user" },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid id" },
      { status: 400 }
    );
  }

  if (auth.user.id === id) {
    return NextResponse.json(
      { success: false, error: "You cannot delete your own account" },
      { status: 400 }
    );
  }

  const existing = await findUserById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "User not found" },
      { status: 404 }
    );
  }

  const ok = await deleteUser(id);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Failed to delete user" },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}
