import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { listAteliersForUser } from "@/lib/queries/ateliers";
import { createBO, createSI, getAllBOs } from "@/lib/queries/stocks";
import { createJournalEntry, formatJournalOperation } from "@/lib/queries/journal";
import type { NewBOInput, NewSIInput, StockPiece } from "@/lib/types";

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
    const bos = await getAllBOs(null, "all", allowedNames);
    return NextResponse.json(bos);
  } catch (err) {
    console.error("GET /api/stocks", err);
    return NextResponse.json(
      { error: "Failed to load stocks" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as Partial<NewBOInput & NewSIInput> & {
      type?: string;
    };
    const type: "BO" | "SI" = body.type === "SI" ? "SI" : "BO";

    if (
      body.stk_category_id == null ||
      body.longueur == null ||
      body.largeur == null ||
      body.atelier == null
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required field(s): stk_category_id, longueur, largeur, atelier",
        },
        { status: 400 }
      );
    }

    const atelier = String(body.atelier);
    const allowedAteliers = await listAteliersForUser(
      auth.user.id,
      auth.user.role,
      { pageSize: 100 }
    );
    const allowedNames = allowedAteliers.map((a) => a.name);
    if (allowedNames.length > 0 && !allowedNames.includes(atelier)) {
      return NextResponse.json(
        { error: "You do not have permission to use this atelier" },
        { status: 403 }
      );
    }

    const userId = auth.user.id;
    const companyId = Number(process.env.DEFAULT_COMPANY_ID ?? 1);

    const created: StockPiece =
      type === "SI"
        ? await createSI({
            stk_category_id: Number(body.stk_category_id),
            longueur: Number(body.longueur),
            largeur: Number(body.largeur),
            atelier,
            user_id: userId,
            company_id: companyId,
            observation: body.observation ?? null,
            create_uid: userId,
          })
        : await createBO({
            stk_category_id: Number(body.stk_category_id),
            longueur: Number(body.longueur),
            largeur: Number(body.largeur),
            atelier,
            user_id: userId,
            company_id: companyId,
            observation: body.observation ?? null,
            supplier_id: body.supplier_id ? Number(body.supplier_id) : null,
            year: body.year ? Number(body.year) : null,
            create_uid: userId,
          });

    await createJournalEntry({
      operation: formatJournalOperation(
        type,
        created.name ?? `#${created.id}`,
        created.longueur,
        created.largeur
      ),
      user_id: auth.user.id,
      user_name: auth.user.username,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/stocks", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create stock piece" },
      { status: 500 }
    );
  }
}
