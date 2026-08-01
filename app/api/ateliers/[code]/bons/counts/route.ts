import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { countBonsAtelierByStatus } from "@/lib/queries/odoo";

export const dynamic = "force-dynamic";

/**
 * GET /api/ateliers/[code]/bons/counts
 *
 * Returns the count of bons atelier grouped by status for the given atelier code.
 * Used by the AutoRefresh component to detect changes without a full page reload.
 */
export async function GET(
  req: Request,
  { params }: { params: { code: string } }
) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const counts = await countBonsAtelierByStatus(params.code);
  return NextResponse.json(counts);
}
