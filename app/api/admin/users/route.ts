import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import {
  createUser,
  isEmailTaken,
  isUsernameTaken,
  listUsers,
} from "@/lib/queries/membership";
import { isValidEmail, isValidPassword } from "@/lib/auth/password";
import type { MembershipRole, NewUserInput } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_ROLES: MembershipRole[] = ["master", "manager", "user"];

function parseAtelierIds(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
}

function parseAtelierId(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validateAtelierId(
  atelierId: number | null,
  atelierIds: number[]
): string | null {
  if (atelierId == null) return null;
  if (!atelierIds.includes(atelierId)) {
    return "Default atelier must be one of the assigned ateliers";
  }
  return null;
}

export async function GET(req: Request) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const roleParam = url.searchParams.get("role");
  const role = roleParam && VALID_ROLES.includes(roleParam as MembershipRole)
    ? (roleParam as MembershipRole)
    : null;
  const sortParam = url.searchParams.get("sort");
  const sort = sortParam === "username" ? "username" : "date_creation";
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Number(url.searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20") || 20;

  const result = await listUsers({ search, role, sort, order, page, pageSize });
  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  let body: Partial<NewUserInput> & { confirm_password?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const username = (body.username ?? "").trim();
  const email = (body.email ?? "").trim();
  const full_name = body.full_name ? body.full_name.trim() : null;
  const odoo_username = body.odoo_username ? body.odoo_username.trim() : null;
  const role = (body.role ?? "user") as MembershipRole;
  const password = body.password ?? "";
  const confirm = body.confirm_password ?? "";
  const atelier_ids = parseAtelierIds(body.atelier_ids);
  const atelier_id = parseAtelierId(body.atelier_id);

  const atelierIdError = validateAtelierId(atelier_id, atelier_ids);
  if (atelierIdError) {
    return NextResponse.json(
      { success: false, error: atelierIdError },
      { status: 400 }
    );
  }

  if (!username) {
    return NextResponse.json(
      { success: false, error: "Username is required" },
      { status: 400 }
    );
  }
  if (!email || !isValidEmail(email)) {
    return NextResponse.json(
      { success: false, error: "A valid email is required" },
      { status: 400 }
    );
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json(
      { success: false, error: "Invalid role" },
      { status: 400 }
    );
  }
  if (!password || !isValidPassword(password)) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Password must be at least 8 characters with one number and one special character",
      },
      { status: 400 }
    );
  }
  if (password !== confirm) {
    return NextResponse.json(
      { success: false, error: "Passwords do not match" },
      { status: 400 }
    );
  }

  if (await isUsernameTaken(username)) {
    return NextResponse.json(
      { success: false, error: "Username already exists" },
      { status: 409 }
    );
  }
  if (await isEmailTaken(email)) {
    return NextResponse.json(
      { success: false, error: "Email already in use" },
      { status: 409 }
    );
  }

  const created = await createUser({
    username,
    email,
    full_name,
    odoo_username,
    role,
    password,
    atelier_id,
    atelier_ids,
  });
  return NextResponse.json({ success: true, data: created }, { status: 201 });
}
