import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import {
  deleteAtelier,
  findAtelierById,
  isAtelierNameTaken,
  updateAtelier,
} from "@/lib/queries/ateliers";
import type { UpdateAtelierInput } from "@/lib/types";

export const dynamic = "force-dynamic";

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
  const atelier = await findAtelierById(id);
  if (!atelier) {
    return NextResponse.json(
      { success: false, error: "Atelier not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data: atelier });
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

  let body: UpdateAtelierInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const existing = await findAtelierById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Atelier not found" },
      { status: 404 }
    );
  }

  if (body.code !== undefined) {
    const code = body.code.trim();
    if (!code) {
      return NextResponse.json(
        { success: false, error: "Code is required" },
        { status: 400 }
      );
    }
    if (code.length > 10) {
      return NextResponse.json(
        { success: false, error: "Code must be 10 characters or fewer" },
        { status: 400 }
      );
    }
    body.code = code;
  }

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }
    if (name.length > 100) {
      return NextResponse.json(
        { success: false, error: "Name must be 100 characters or fewer" },
        { status: 400 }
      );
    }
    if (await isAtelierNameTaken(name, id)) {
      return NextResponse.json(
        { success: false, error: "An atelier with this name already exists" },
        { status: 409 }
      );
    }
    body.name = name;
  }

  const updated = await updateAtelier(id, body);
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Failed to update atelier" },
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

  const existing = await findAtelierById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Atelier not found" },
      { status: 404 }
    );
  }

  const ok = await deleteAtelier(id);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Failed to delete atelier" },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}