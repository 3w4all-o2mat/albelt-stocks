import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { listAllStocks } from "@/lib/queries/stocks";
import type { PieceType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const page = Number(url.searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(url.searchParams.get("pageSize") ?? "40") || 40;
  const typeParam = url.searchParams.get("type");
  const type = (typeParam && ["BO", "CC", "CS", "CP", "SI"].includes(typeParam)
    ? typeParam
    : null) as PieceType | null;

  const result = await listAllStocks({ type, page, pageSize });
  return NextResponse.json({ success: true, data: result });
}
