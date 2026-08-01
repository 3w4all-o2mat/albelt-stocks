import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import {
  createCategory,
  isCategoryDuplicate,
  listCategories,
  syncSiStockForCategory,
} from "@/lib/queries/categories";
import {
  NATURE_OPTIONS,
  COLOR_OPTIONS,
  PLIES_OPTIONS,
  THICKNESS_OPTIONS,
  MOTIF_OPTIONS,
  isKnownCategoryField,
} from "@/lib/bobine-category-options";
import type { NewCategoryInput } from "@/lib/types";

export const dynamic = "force-dynamic";

const NATURE_LABELS = new Set(NATURE_OPTIONS.map((o) => o.label));
const COLOR_LABELS = new Set(COLOR_OPTIONS.map((o) => o.label));
const PLIES_LABELS = new Set(PLIES_OPTIONS.map((o) => o.label));
const THICKNESS_LABELS = new Set(THICKNESS_OPTIONS.map((o) => o.label));
const MOTIF_LABELS = new Set(MOTIF_OPTIONS.map((o) => o.label));

export async function GET(req: Request) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const sortParam = url.searchParams.get("sort");
  const sort = sortParam === "nature" ? "nature" : sortParam === "name" ? "name" : "id";
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Number(url.searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20") || 20;

  const result = await listCategories({ search, sort, order, page, pageSize });
  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  let body: Partial<NewCategoryInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const nature = (body.nature ?? "").trim();
  const color = (body.color ?? "").trim();
  const plies = (body.plies ?? "").trim();
  const thickness = (body.thickness ?? "").trim();
  const motif = (body.motif ?? "").trim();

  if (!NATURE_LABELS.has(nature)) {
    return NextResponse.json(
      { success: false, error: "Invalid nature" },
      { status: 400 }
    );
  }
  if (!COLOR_LABELS.has(color)) {
    return NextResponse.json(
      { success: false, error: "Invalid color" },
      { status: 400 }
    );
  }
  if (!PLIES_LABELS.has(plies)) {
    return NextResponse.json(
      { success: false, error: "Invalid plies" },
      { status: 400 }
    );
  }
  if (!THICKNESS_LABELS.has(thickness)) {
    return NextResponse.json(
      { success: false, error: "Invalid thickness" },
      { status: 400 }
    );
  }
  if (!MOTIF_LABELS.has(motif)) {
    return NextResponse.json(
      { success: false, error: "Invalid motif" },
      { status: 400 }
    );
  }

  const siActive = body.si_active === true;
  const input: NewCategoryInput = { nature, color, plies, thickness, motif, si_active: siActive };

  if (!isKnownCategoryField(input)) {
    return NextResponse.json(
      { success: false, error: "Unknown category field value" },
      { status: 400 }
    );
  }

  if (await isCategoryDuplicate(input)) {
    return NextResponse.json(
      { success: false, error: "A category with these attributes already exists" },
      { status: 409 }
    );
  }

  const created = await createCategory(input);

  // Synchronise la ligne SI si demandé
  if (siActive && created.name) {
    await syncSiStockForCategory(created.id, true, created.name);
  }

  return NextResponse.json({ success: true, data: created }, { status: 201 });
}