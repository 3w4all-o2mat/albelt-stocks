import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth/guard";
import { findAtelierByName } from "@/lib/queries/ateliers";
import { updateStockAtelier, getPieceById } from "@/lib/queries/stocks";
import { createJournalEntry } from "@/lib/queries/journal";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireRole(req, ["master", "manager"]);
  if (auth instanceof NextResponse) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id)) {
    return NextResponse.json(
      { success: false, error: "Invalid id" },
      { status: 400 }
    );
  }

  let body: { atelier?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body" },
      { status: 400 }
    );
  }

  const newAtelier = (body.atelier ?? "").trim();
  if (!newAtelier) {
    return NextResponse.json(
      { success: false, error: "Atelier destination is required" },
      { status: 400 }
    );
  }

  // Validate that the target atelier exists.
  const targetAtelier = await findAtelierByName(newAtelier);
  if (!targetAtelier) {
    return NextResponse.json(
      { success: false, error: `Atelier "${newAtelier}" does not exist` },
      { status: 404 }
    );
  }

  // Fetch the current piece to know the old atelier.
  const currentPiece = await getPieceById(id);
  if (!currentPiece) {
    return NextResponse.json(
      { success: false, error: "Stock piece not found" },
      { status: 404 }
    );
  }

  const oldAtelier = currentPiece.atelier;
  if (oldAtelier === newAtelier) {
    return NextResponse.json(
      { success: false, error: "The item is already in this atelier" },
      { status: 400 }
    );
  }

  // Perform the transfer.
  const updated = await updateStockAtelier(id, newAtelier);
  if (!updated) {
    return NextResponse.json(
      { success: false, error: "Failed to update stock piece" },
      { status: 500 }
    );
  }

  // Log the transfer to the journal.
  const itemLabel = currentPiece.name ?? currentPiece.chained_name ?? `#${currentPiece.id}`;
  await createJournalEntry({
    operation: `Transfert de "${itemLabel}" de "${oldAtelier}" vers "${newAtelier}"`,
    user_id: auth.user.id,
    user_name: auth.user.username,
  });

  return NextResponse.json({ success: true, data: updated });
}
