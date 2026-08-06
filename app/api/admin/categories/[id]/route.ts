import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import {
  deleteCategory,
  findCategoryById,
  isCategoryDuplicate,
  syncSiStockForCategory,
  updateCategory,
} from "@/lib/queries/categories";
import {
  NATURE_OPTIONS,
  COLOR_OPTIONS,
  PLIES_OPTIONS,
  THICKNESS_OPTIONS,
  MOTIF_OPTIONS,
  PAYS_OPTIONS,
} from "@/lib/bobine-category-options";
import type { UpdateCategoryInput } from "@/lib/types";

export const dynamic = "force-dynamic";

const NATURE_LABELS = new Set(NATURE_OPTIONS.map((o) => o.label));
const COLOR_LABELS = new Set(COLOR_OPTIONS.map((o) => o.label));
const PLIES_LABELS = new Set(PLIES_OPTIONS.map((o) => o.label));
const THICKNESS_LABELS = new Set(THICKNESS_OPTIONS.map((o) => o.label));
const MOTIF_LABELS = new Set(MOTIF_OPTIONS.map((o) => o.label));
const PAYS_LABELS = new Set(PAYS_OPTIONS.map((o) => o.label));

function validateField(
  field: keyof UpdateCategoryInput,
  value: string
): string | null {
  switch (field) {
    case "nature":
      return NATURE_LABELS.has(value) ? null : "Invalid nature";
    case "color":
      return COLOR_LABELS.has(value) ? null : "Invalid color";
    case "plies":
      return PLIES_LABELS.has(value) ? null : "Invalid plies";
    case "thickness":
      return THICKNESS_LABELS.has(value) ? null : "Invalid thickness";
    case "motif":
      return MOTIF_LABELS.has(value) ? null : "Invalid motif";
    case "pays":
      return value === "" || PAYS_LABELS.has(value) ? null : "Invalid pays";
    default:
      return null;
  }
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(req, ["master", "manager"]);
  if (auth instanceof NextResponse) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid id" },
      { status: 400 }
    );
  }
  const category = await findCategoryById(id);
  if (!category) {
    return NextResponse.json(
      { success: false, error: "Category not found" },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data: category });
}

export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(req, ["master", "manager"]);
  if (auth instanceof NextResponse) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid id" },
      { status: 400 }
    );
  }

  let body: UpdateCategoryInput;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const existing = await findCategoryById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Category not found" },
      { status: 404 }
    );
  }

  for (const [field, value] of Object.entries(body)) {
    if (value === undefined) continue;
    if (field === "pays" && value === null) continue; // null is allowed for nullable pays
    const err = validateField(field as keyof UpdateCategoryInput, String(value));
    if (err) {
      return NextResponse.json({ success: false, error: err }, { status: 400 });
    }
  }

  const merged = {
    nature: body.nature ?? existing.nature,
    color: body.color ?? existing.color,
    plies: body.plies ?? existing.plies,
    thickness: body.thickness ?? existing.thickness,
    motif: body.motif ?? existing.motif,
  };

  if (await isCategoryDuplicate(merged, id)) {
    return NextResponse.json(
      { success: false, error: "A category with these attributes already exists" },
      { status: 409 }
    );
  }

  const updated = await updateCategory(id, body);
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Failed to update category" },
      { status: 500 }
    );
  }

  // Synchronise la ligne SI si le statut si_active a changé
  if (body.si_active !== undefined && body.si_active !== existing.si_active && updated.name) {
    await syncSiStockForCategory(id, body.si_active, updated.name);
  }

  return NextResponse.json({ success: true, data: updated });
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(req, ["master", "manager"]);
  if (auth instanceof NextResponse) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid id" },
      { status: 400 }
    );
  }

  const existing = await findCategoryById(id);
  if (!existing) {
    return NextResponse.json(
      { success: false, error: "Category not found" },
      { status: 404 }
    );
  }

  const ok = await deleteCategory(id);
  if (!ok) {
    return NextResponse.json(
      { success: false, error: "Failed to delete category" },
      { status: 500 }
    );
  }
  return NextResponse.json({ success: true });
}