import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { getAncestors } from "@/lib/queries/stocks";

export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const id = Number(params.id);
    if (Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }
    const ancestors = await getAncestors(id);
    return NextResponse.json(ancestors);
  } catch (err) {
    console.error("GET /api/stocks/[id]/ancestors", err);
    return NextResponse.json(
      { error: "Failed to load ancestors" },
      { status: 500 }
    );
  }
}
