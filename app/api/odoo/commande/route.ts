import { NextResponse } from "next/server";
import odooPool from "@/lib/odoo-db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const name = searchParams.get("name")?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "Le paramètre 'name' est requis." },
      { status: 400 }
    );
  }

  try {
    const result = await odooPool.query(
      `
        SELECT
          c.id,
          c.name,
          c.state,
          c.creation_date,
          c.confirmation_date,
          c.amount_ht,
          c.amount_ttc,
          c.amount_tva,
          c.longueur,
          c.largeur,
          c.atelier,
          p.id   AS partner_id,
          p.name AS partner_name,
          p.display_name,
          p.address,
          p.phone,
          p.email
        FROM sn_sales_commandes c
        LEFT JOIN sn_sales_partner p ON p.id = c.partner_id
        WHERE c.name ILIKE $1
        LIMIT 1
      `,
      [name]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: `Aucune commande trouvée avec le nom "${name}".` },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    // Fetch command lines
    const linesResult = await odooPool.query(
      `
        SELECT id, name, qty, commande_id, longueur, largeur
        FROM sn_sales_commande_lines
        WHERE commande_id = $1
        ORDER BY id
      `,
      [row.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        name: row.name,
        state: row.state,
        creation_date: row.creation_date,
        confirmation_date: row.confirmation_date,
        amount_ht: row.amount_ht,
        amount_ttc: row.amount_ttc,
        amount_tva: row.amount_tva,
        longueur: row.longueur,
        largeur: row.largeur,
        atelier: row.atelier,
        partner: {
          id: row.partner_id,
          name: row.partner_name,
          display_name: row.display_name,
          address: row.address ?? null,
          phone: row.phone,
          email: row.email,
        },
        lines: linesResult.rows,
      },
    });
  } catch (err) {
    console.error("GET /api/odoo/commande", err);
    return NextResponse.json(
      { error: "Erreur lors de la recherche dans la base Odoo." },
      { status: 500 }
    );
  }
}
