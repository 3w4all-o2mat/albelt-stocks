import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import {
  createAtelier,
  isAtelierNameTaken,
  listAteliers,
} from "@/lib/queries/ateliers";
import type { NewAtelierInput } from "@/lib/types";

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

  const result = await listAteliers({
    search,
    active,
    sort,
    order,
    page,
    pageSize,
  });
  return NextResponse.json({ success: true, data: result });
}

export async function POST(req: Request) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  let body: Partial<NewAtelierInput>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const code = (body.code ?? "").trim();
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

  const name = (body.name ?? "").trim();
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

  const is_active = body.is_active ?? true;

  if (await isAtelierNameTaken(name)) {
    return NextResponse.json(
      { success: false, error: "An atelier with this name already exists" },
      { status: 409 }
    );
  }

  const created = await createAtelier({ code, name, is_active });
  return NextResponse.json({ success: true, data: created }, { status: 201 });
}