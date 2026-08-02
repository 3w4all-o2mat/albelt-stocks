import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { listAteliersForUser } from "@/lib/queries/ateliers";
import { findAvailableStockPieces } from "@/lib/queries/stocks";
import {
  COLOR_OPTIONS,
  MOTIF_OPTIONS,
  NATURE_OPTIONS,
  PAYS_OPTIONS,
  PLIES_OPTIONS,
  THICKNESS_OPTIONS,
} from "@/lib/bobine-category-options";

export const dynamic = "force-dynamic";

const ATTRIBUTE_SETS: Record<string, Set<string>> = {
  nature: new Set(NATURE_OPTIONS.map((o) => o.label)),
  color: new Set(COLOR_OPTIONS.map((o) => o.label)),
  plies: new Set(PLIES_OPTIONS.map((o) => o.label)),
  thickness: new Set(THICKNESS_OPTIONS.map((o) => o.label)),
  motif: new Set(MOTIF_OPTIONS.map((o) => o.label)),
  pays: new Set(PAYS_OPTIONS.map((o) => o.label)),
};

function readAttribute(
  body: Record<string, unknown>,
  key: string
): string | undefined {
  const value = body[key];
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as Record<string, unknown>;

    const longueur = Number(body.longueur);
    const largeur = Number(body.largeur);

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

    const attributes: Record<string, string> = {};
    for (const key of Object.keys(ATTRIBUTE_SETS)) {
      const value = readAttribute(body, key);
      if (value === undefined) continue;
      const allowed = ATTRIBUTE_SETS[key];
      if (!allowed.has(value)) {
        return NextResponse.json(
          { success: false, error: `Valeur invalide pour ${key}` },
          { status: 400 }
        );
      }
      attributes[key] = value;
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

    const data = await findAvailableStockPieces({
      longueur,
      largeur,
      atelier,
      allowedAteliers: allowedNames.length > 0 ? allowedNames : undefined,
      ...attributes,
    });

    return NextResponse.json({ success: true, data });
  } catch (err) {
    console.error("POST /api/availability", err);
    return NextResponse.json(
      { success: false, error: "Erreur lors de la recherche" },
      { status: 500 }
    );
  }
}
