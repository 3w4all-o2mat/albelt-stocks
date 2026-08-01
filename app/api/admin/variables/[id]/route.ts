import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import {
  deleteVariable,
  findVariableById,
  updateVariable,
} from "@/lib/queries/variables";
import type { UpdateVariableInput, VariableType } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_TYPES: VariableType[] = ["integer", "string", "boolean"];

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
  const variable = await findVariableById(id);
  if (!variable) {
    return NextResponse.json(
      { success: false, error: "Variable not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data: variable });
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

  let body: UpdateVariableInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const existing = await findVariableById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Variable not found" },
      { status: 404 }
    );
  }

  const type = body.type ?? existing.type;
  const value = body.value ?? existing.value;

  if (body.type !== undefined && !VALID_TYPES.includes(body.type)) {
    return NextResponse.json(
      { success: false, error: "Invalid type" },
      { status: 400 }
    );
  }

  if (body.value !== undefined) {
    if (type === "integer" && !/^-?\d+$/.test(value.trim())) {
      return NextResponse.json(
        { success: false, error: "Value must be an integer" },
        { status: 400 }
      );
    }
    if (
      type === "boolean" &&
      !["true", "false"].includes(value.trim().toLowerCase())
    ) {
      return NextResponse.json(
        { success: false, error: "Value must be true or false" },
        { status: 400 }
      );
    }
  }

  const updated = await updateVariable(id, body);
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Failed to update variable" },
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

  const existing = await findVariableById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Variable not found" },
      { status: 404 }
    );
  }

  const ok = await deleteVariable(id);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Failed to delete variable" },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}