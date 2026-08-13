import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const stk_category_id = searchParams.get("stk_category_id");
  if (!stk_category_id || Number.isNaN(Number(stk_category_id))) {
    return NextResponse.json(
      { error: "Missing or invalid stk_category_id" },
      { status: 400 }
    );
  }

  try {
    const row = await queryOne<{ max_seq: number }>(
      `SELECT COALESCE(MAX(sequence), 0)::int AS max_seq
         FROM albelt_stocks
        WHERE type = 'BO' AND stk_category_id = $1`,
      [Number(stk_category_id)]
    );
    return NextResponse.json({ lastSequence: row?.max_seq ?? 0 });
  } catch (err) {
    console.error("GET /api/stocks/last-sequence", err);
    return NextResponse.json(
      { error: "Failed to load sequence" },
      { status: 500 }
    );
  }
}
