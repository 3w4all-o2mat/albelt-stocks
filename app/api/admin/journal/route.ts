import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { listJournal } from "@/lib/queries/journal";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireRole(req, ["master"]);
  if (auth instanceof NextResponse) return auth;

  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1") || 1;
  const pageSize = Number(url.searchParams.get("pageSize") ?? "50") || 50;

  const result = await listJournal({ search, page, pageSize });
  return NextResponse.json({ success: true, data: result });
}