import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import {
  deleteSupplier,
  findSupplierById,
  isSupplierNameTaken,
  updateSupplier,
} from "@/lib/queries/suppliers";
import type { UpdateSupplierInput } from "@/lib/types";

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

  try {
    const supplier = await findSupplierById(id);
    if (!supplier) {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ success: true, data: supplier });
  } catch (err) {
    console.error("GET /api/admin/suppliers/[id]", err);
    return NextResponse.json(
      { success: false, error: "Failed to load supplier" },
      { status: 500 }
    );
  }
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

  let body: UpdateSupplierInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const existing = await findSupplierById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Supplier not found" },
      { status: 404 }
    );
  }

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }
    if (name.length > 200) {
      return NextResponse.json(
        { success: false, error: "Name must be 200 characters or fewer" },
        { status: 400 }
      );
    }
    if (await isSupplierNameTaken(name, id)) {
      return NextResponse.json(
        { success: false, error: "A supplier with this name already exists" },
        { status: 409 }
      );
    }
    body.name = name;
  }

  if (body.country_code !== undefined) {
    body.country_code = body.country_code.trim().toUpperCase();
    if (!body.country_code) {
      return NextResponse.json(
        { success: false, error: "country_code cannot be empty" },
        { status: 400 }
      );
    }
  }

  try {
    const updated = await updateSupplier(id, body);
    return NextResponse.json({ success: true, data: updated });
  } catch (err) {
    console.error("PUT /api/admin/suppliers/[id]", err);
    return NextResponse.json(
      { success: false, error: "Failed to update supplier" },
      { status: 500 }
    );
  }
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

  try {
    const supplier = await findSupplierById(id);
    if (!supplier) {
      return NextResponse.json(
        { success: false, error: "Supplier not found" },
        { status: 404 }
      );
    }

    await deleteSupplier(id);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err?.code === "23503") {
      return NextResponse.json(
        {
          success: false,
          error:
            "Cannot delete this supplier: it is referenced by one or more stock pieces.",
        },
        { status: 409 }
      );
    }
    console.error("DELETE /api/admin/suppliers/[id]", err);
    return NextResponse.json(
      { success: false, error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
