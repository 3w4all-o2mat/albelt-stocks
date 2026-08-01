import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { listAteliersForUser } from "@/lib/queries/ateliers";
import { getDashboardKpis, getRecentCuts } from "@/lib/queries/stocks";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const allowedAteliers = await listAteliersForUser(
      auth.user.id,
      auth.user.role,
      { pageSize: 100 }
    );
    const allowedNames = allowedAteliers.map((a) => a.name);

    const [kpis, recent] = await Promise.all([
      getDashboardKpis(null, allowedNames),
      getRecentCuts(20, null, allowedNames),
    ]);
    return NextResponse.json({ kpis, recent, ateliers: allowedAteliers });
  } catch (err) {
    console.error("GET /api/dashboard", err);
    return NextResponse.json(
      { error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
