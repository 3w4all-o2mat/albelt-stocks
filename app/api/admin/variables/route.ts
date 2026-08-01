import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import {
  createVariable,
  isVariableKeyTaken,
  listVariables,
} from "@/lib/queries/variables";
import type { NewVariableInput, VariableType } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_TYPES: VariableType[] = ["integer", "string", "boolean"];
const VALID_KEY = /^[A-Z0-9_]+$/;

export async function GET(req: Request) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20") || 20;

  const result = await listVariables({ search, page, pageSize });
  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  let body: Partial<NewVariableInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const key = (body.key ?? "").trim().toUpperCase();
  const label = (body.label ?? "").trim();
  const type = (body.type ?? "string") as VariableType;
  const value = (body.value ?? "").trim();

  if (!key) {
    return NextResponse.json(
      { success: false, error: "Key is required" },
      { status: 400 }
    );
  }
  if (!VALID_KEY.test(key)) {
    return NextResponse.json(
      {
        success: false,
        error: "Key must contain only uppercase letters, digits and underscores",
      },
      { status: 400 }
    );
  }
  if (!label) {
    return NextResponse.json(
      { success: false, error: "Label is required" },
      { status: 400 }
    );
  }
  if (!VALID_TYPES.includes(type)) {
    return NextResponse.json(
      { success: false, error: "Invalid type" },
      { status: 400 }
    );
  }

  if (type === "integer" && !/^-?\d+$/.test(value)) {
    return NextResponse.json(
      { success: false, error: "Value must be an integer" },
      { status: 400 }
    );
  }
  if (
    type === "boolean" &&
    !["true", "false"].includes(value.toLowerCase())
  ) {
    return NextResponse.json(
      { success: false, error: "Value must be true or false" },
      { status: 400 }
    );
  }

  if (await isVariableKeyTaken(key)) {
    return NextResponse.json(
      { success: false, error: "A variable with this key already exists" },
      { status: 409 }
    );
  }

  const created = await createVariable({ key, label, type, value });
  return NextResponse.json({ success: true, data: created }, { status: 201 });
}