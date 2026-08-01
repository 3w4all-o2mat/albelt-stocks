import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import {
  createSupplier,
  isSupplierNameTaken,
  listSuppliers,
} from "@/lib/queries/suppliers";
import type { NewSupplierInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const activeParam = url.searchParams.get("active");
  const active =
    activeParam === "true" ? true : activeParam === "false" ? false : null;
  const sortParam = url.searchParams.get("sort");
  const sort = sortParam === "name" ? "name" : "date_creation";
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";
  const page = Number(url.searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(url.searchParams.get("pageSize") ?? "20") || 20;

  try {
    const result = await listSuppliers({
      search,
      active,
      sort,
      order,
      page,
      pageSize,
    });
    return NextResponse.json({ success: true, data: result });
  } catch (err) {
    console.error("GET /api/admin/suppliers", err);
    return NextResponse.json(
      { success: false, error: "Failed to load suppliers" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  let body: Partial<NewSupplierInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const name = (body.name ?? "").trim();
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

  const country_code = (body.country_code ?? "").trim().toUpperCase();
  if (!country_code) {
    return NextResponse.json(
      { success: false, error: "country_code is required" },
      { status: 400 }
    );
  }

  const is_active = body.is_active ?? true;

  if (await isSupplierNameTaken(name)) {
    return NextResponse.json(
      { success: false, error: "A supplier with this name already exists" },
      { status: 409 }
    );
  }

  try {
    const created = await createSupplier({ name, country_code, is_active });
    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err) {
    console.error("POST /api/admin/suppliers", err);
    return NextResponse.json(
      { success: false, error: "Failed to create supplier" },
      { status: 500 }
    );
  }
}
