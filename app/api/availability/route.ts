import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { listAteliersForUser } from "@/lib/queries/ateliers";
import { findAvailableStockPieces } from "@/lib/queries/stocks";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const stk_category_id = Number(body.stk_category_id);
    const longueur = Number(body.longueur);
    const largeur = Number(body.largeur);

    if (!Number.isFinite(stk_category_id) || stk_category_id <= 0) {
      return NextResponse.json(
        { success: false, error: "Catégorie invalide" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(longueur) || longueur <= 0) {
      return NextResponse.json(
        { success: false, error: "Longueur invalide" },
        { status: 400 }
      );
    }
    if (!Number.isFinite(largeur) || largeur <= 0) {
      return NextResponse.json(
        { success: false, error: "Largeur invalide" },
        { status: 400 }
      );
    }

    const atelier =
      typeof body.atelier === "string" ? body.atelier.trim() || null : null;

    const allowedAteliers = await listAteliersForUser(
      auth.user.id,
      auth.user.role,
      { pageSize: 100 }
    );
    const allowedNames = allowedAteliers.map((a) => a.name);

    if (atelier && allowedNames.length > 0 && !allowedNames.includes(atelier)) {
      return NextResponse.json(
        { success: false, error: "Atelier non autorisé" },
        { status: 403 }
      );
    }

    const data = await findAvailableStockPieces(
      stk_category_id,
      longueur,
      largeur,
      atelier,
      allowedNames.length > 0 ? allowedNames : undefined
    );

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("POST /api/availability", err);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la recherche" },
      { status: 500 }
    );
  }
}
