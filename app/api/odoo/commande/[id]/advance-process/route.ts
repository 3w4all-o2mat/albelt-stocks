import { NextResponse } from "next/server";
import odooPool from "@/lib/odoo-db";
import { requireAuth } from "@/lib/auth/guard";
import { findOdooUserIdByMembershipId } from "@/lib/queries/membership";
import {
  advanceCommandeProcess,
  getCommandeProcess,
  insertCmdSuivi,
} from "@/lib/queries/odoo";

export const dynamic = "force-dynamic";

/**
 * POST /api/odoo/commande/[id]/advance-process
 *
 * Advances a sn_sales_commandes row by one step (current_process = str(int(current) + 1))
 * and records the transition in albelt_cmd_suivi. Both writes run in a single
 * Odoo DB transaction. The acting user is resolved from the session's
 * albelt_membership row (odoo_username → res_users.id).
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth(_req);
  if (auth instanceof NextResponse) return auth;

  const id = Number(params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return NextResponse.json(
      { success: false, error: "Invalid commande id" },
      { status: 400 }
    );
  }

  // Resolve the acting user's Odoo res_users.id.
  const odooUserId = await findOdooUserIdByMembershipId(auth.user.id);
  if (odooUserId == null) {
    return NextResponse.json(
      {
        success: false,
        error:
          "User is not linked to an Odoo account (odoo_username is missing or unknown)",
      },
      { status: 400 }
    );
  }

  const client = await odooPool.connect();
  try {
    await client.query("BEGIN");

    // Read current_process inside the transaction (for race safety).
    const current = await client.query<{ current_process: string }>(
      `SELECT current_process FROM sn_sales_commandes WHERE id = $1 FOR UPDATE`,
      [id]
    );
    if (current.rows.length === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, error: "Commande not found" },
        { status: 404 }
      );
    }

    const currentProcess = current.rows[0].current_process;
    const nextProcess = String(Number(currentProcess) + 1);

    const updated = await advanceCommandeProcess(client, id, nextProcess);
    if (updated === 0) {
      await client.query("ROLLBACK");
      return NextResponse.json(
        { success: false, error: "Failed to update commande" },
        { status: 500 }
      );
    }

    const suivi = await insertCmdSuivi(client, {
      commandeId: id,
      userId: odooUserId,
      cmdState: nextProcess,
    });

    await client.query("COMMIT");

    return NextResponse.json({
      success: true,
      data: {
        id,
        from: currentProcess,
        to: nextProcess,
        suivi_id: suivi.id,
        date_event: suivi.date_event,
        user_id: odooUserId,
      },
    });
  } catch (err) {
    try {
      await client.query("ROLLBACK");
    } catch {
      // ignore
    }
    console.error("POST /api/odoo/commande/[id]/advance-process", err);
    return NextResponse.json(
      { success: false, error: "Failed to advance commande process" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
