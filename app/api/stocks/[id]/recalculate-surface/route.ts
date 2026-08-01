import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import pool from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(
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

    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Get the parent piece's total surface
      const parentRes = await client.query(
        `SELECT surface FROM albelt_stocks WHERE id = $1`,
        [id]
      );
      if (parentRes.rows.length === 0) {
        await client.query("ROLLBACK");
        return NextResponse.json({ error: "Not found" }, { status: 404 });
      }

      const parentSurface = Number(parentRes.rows[0].surface ?? 0);

      // Sum all children surfaces (cuts made from this piece)
      const sumRes = await client.query(
        `SELECT COALESCE(SUM(surface), 0)::int AS total FROM albelt_stocks WHERE parent_id = $1`,
        [id]
      );
      const childrenSurface = Number(sumRes.rows[0].total ?? 0);
      const newRestante = Math.max(0, parentSurface - childrenSurface);

      // Update the piece's surface_restante
      await client.query(
        `UPDATE albelt_stocks SET surface_restante = $1, write_uid = $2, write_date = NOW() WHERE id = $3`,
        [newRestante, auth.user.id, id]
      );

      await client.query("COMMIT");

      return NextResponse.json({ surface_restante: newRestante });
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    console.error("POST /api/stocks/[id]/recalculate-surface", err);
    return NextResponse.json(
      { error: "Failed to recalculate surface" },
      { status: 500 }
    );
  }
}
