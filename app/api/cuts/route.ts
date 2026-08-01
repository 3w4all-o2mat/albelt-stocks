import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/guard";
import pool from "@/lib/db";
import odooPool from "@/lib/odoo-db";
import { listAteliersForUser } from "@/lib/queries/ateliers";
import { createCut, getChildren, getPieceById } from "@/lib/queries/stocks";
import { createJournalEntry, formatJournalOperation } from "@/lib/queries/journal";
import { validateCut } from "@/lib/utils";
import type { NewCutInput, PieceType } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES: PieceType[] = ["CC", "CS", "CP"];

export async function POST(req: Request) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await req.json()) as Partial<NewCutInput>;

    const type = body.type as PieceType | undefined;
    if (!type || !ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Invalid type (must be one of ${ALLOWED_TYPES.join(", ")})` },
        { status: 400 }
      );
    }

    const parentId = Number(body.parent_id);
    if (Number.isNaN(parentId)) {
      return NextResponse.json(
        { error: "Missing or invalid parent_id" },
        { status: 400 }
      );
    }

    const longueur = Number(body.longueur);
    const largeur = Number(body.largeur);
    const cute_x = Number(body.cute_x ?? 0);
    const cute_y = Number(body.cute_y ?? 0);
    const stk_category_id = Number(body.stk_category_id);

    if (!longueur || !largeur || !stk_category_id) {
      return NextResponse.json(
        { error: "Missing longueur, largeur or stk_category_id" },
        { status: 400 }
      );
    }

    const parent = await getPieceById(parentId);
    if (!parent) {
      return NextResponse.json(
        { error: "Source piece not found" },
        { status: 404 }
      );
    }

    const existingCuts = await getChildren(parentId);
    const check = validateCut(
      cute_x,
      cute_y,
      longueur,
      largeur,
      parent.longueur,
      parent.largeur,
      existingCuts
    );
    if (!check.ok) {
      return NextResponse.json({ error: check.error }, { status: 400 });
    }

    const userId = auth.user.id;
    const companyId = Number(process.env.DEFAULT_COMPANY_ID ?? 1);
    const atelier = body.atelier || parent.atelier;

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

    const cmd_id = body.cmd_id ? Number(body.cmd_id) : null;
    const line_id = body.line_id ? Number(body.line_id) : null;
    // Operator-entered adjustment length for the commande line (côté droit).
    // Persisted on albelt_commandes_lines.longueur_dx, never overwritten on
    // re-sync of an existing line. Only meaningful for type=CC.
    const longueur_dx =
      body.longueur_dx != null ? Number(body.longueur_dx) : 0;

    const created = await createCut({
      type: type as "CC" | "CS" | "CP",
      stk_category_id,
      parent_id: parentId,
      longueur,
      largeur,
      cute_x,
      cute_y,
      cmd_id,
      cmd_name: body.cmd_name ?? null,
      line_id,
      atelier,
      user_id: userId,
      company_id: companyId,
      observation: body.observation ?? null,
      create_uid: userId,
    });

    // If the cut is associated with a commande, sync the auxiliary tables
    if (cmd_id) {
      try {
        // Fetch commande info from Odoo DB (incl. c.longueur for mirror)
        const cmdResult = await odooPool.query(
          `
            SELECT
              c.id, c.name, c.confirmation_date, c.partner_id, c.longueur,
              p.id   AS partner_id,
              p.name AS partner_name,
              p.address,
              p.email,
              p.phone
            FROM sn_sales_commandes c
            LEFT JOIN sn_sales_partner p ON p.id = c.partner_id
            WHERE c.id = $1
            LIMIT 1
          `,
          [cmd_id]
        );

        const cmd = cmdResult.rows[0] ?? null;

        if (cmd) {
          // Upsert client
          await pool.query(
            `INSERT INTO albelt_clients (id, name, address, email, phone)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
            [
              cmd.partner_id,
              cmd.partner_name,
              cmd.address ?? null,
              cmd.email ?? null,
              cmd.phone ?? null,
            ]
          );

          // Upsert commande
          await pool.query(
            `INSERT INTO albelt_commandes (cmd_id, client_id, cmd_date)
             VALUES ($1, $2, $3)
             ON CONFLICT (cmd_id) DO NOTHING`,
            [
              cmd_id,
              cmd.partner_id,
              cmd.confirmation_date
                ? new Date(cmd.confirmation_date).toISOString()
                : null,
            ]
          );
        }

        // Upsert commande line (if line_id is provided)
        if (line_id) {
          const lineResult = await odooPool.query(
            `SELECT id, name, qty, commande_id, longueur
             FROM sn_sales_commande_lines
             WHERE id = $1
             LIMIT 1`,
            [line_id]
          );

          if (lineResult.rows.length > 0) {
            const line = lineResult.rows[0];
            // longueur_origine is sourced from the Odoo line (sn_sales_commande_lines.longueur),
            // which is per-line and more accurate than the commande header. The commande
            // header's longueur is shared by all lines and is NULL on every existing row.
            // longueur_dx is operator-entered and is deliberately omitted from
            // the ON CONFLICT DO UPDATE set so a re-sync never overwrites it.
            const longueur_origine =
              line.longueur != null ? Number(line.longueur) : null;
            await pool.query(
              `INSERT INTO albelt_commandes_lines
                 (line_id, cmd_id, line_designation, line_qty, longueur_origine, longueur_dx)
               VALUES ($1, $2, $3, $4, $5, $6)
               ON CONFLICT (line_id) DO UPDATE SET
                 cmd_id            = EXCLUDED.cmd_id,
                 line_designation  = EXCLUDED.line_designation,
                 line_qty          = EXCLUDED.line_qty,
                 longueur_origine  = EXCLUDED.longueur_origine`,
              [line_id, cmd_id, line.name, line.qty, longueur_origine, longueur_dx]
            );
          }
        }
      } catch (syncErr) {
        // Log sync error but don't fail the cut creation
        console.error("Failed to sync commande tables", syncErr);
      }
    }

    await createJournalEntry({
      operation: formatJournalOperation(
        created.type,
        created.name ?? `#${created.id}`,
        created.longueur,
        created.largeur
      ),
      user_id: auth.user.id,
      user_name: auth.user.username,
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err) {
    console.error("POST /api/cuts", err);
    return NextResponse.json(
      { error: "Failed to create cut" },
      { status: 500 }
    );
  }
}
