import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import { deletePiece, getChildren, getPieceById } from "@/lib/queries/stocks";

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
    const piece = await getPieceById(id);
    if (!piece) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(piece);
  } catch (err) {
    console.error("GET /api/stocks/[id]", err);
    return NextResponse.json(
      { error: "Failed to load piece" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if the piece has children before allowing deletion
    const children = await getChildren(id);
    if (children.length > 0) {
      return NextResponse.json(
        {
          error: `Vous ne pouvez pas supprimer cette pièce, Elle a des ${children.length} descendant(s)`,
        },
        { status: 409 }
      );
    }

    await deletePiece(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/stocks/[id]", err);
    return NextResponse.json(
      { error: "Failed to delete piece" },
      { status: 500 }
    );
  }
}
