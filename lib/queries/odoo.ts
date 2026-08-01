import type { PoolClient } from "pg";
import odooPool from "@/lib/odoo-db";
import type { BonAtelierCommande, BonAtelierLine } from "@/lib/types";

interface BonAtelierRow {
  c_id: number;
  c_name: string;
  c_atelier: number;
  c_process: string;
  c_priority: number | null;
  c_current_process_datetime: string | null;
  c_partner_name: string | null;
  c_user_name: string | null;
  l_id: number;
  l_name: string;
  l_qty: number;
  prd_code: string | null;
}

export interface ListBonsAtelierOptions {
  /** Atelier code (stored as text in sn_sales_commandes.atelier). */
  atelierCode: string;
  /** Filter by sn_sales_commandes.current_process. */
  currentProcess: string;
}

/**
 * Fetch sales commandes from the Odoo DB for a given atelier (by code) and
 * current_process, joined with their lines and product code.
 *
 * Rows are grouped into nested BonAtelierCommande[] (lines array).
 */
export async function listBonsAtelier({
  atelierCode,
  currentProcess,
}: ListBonsAtelierOptions): Promise<BonAtelierCommande[]> {
  const result = await odooPool.query<BonAtelierRow>(
    `SELECT c.id AS c_id,
            c.name AS c_name,
            c.atelier AS c_atelier,
            c.current_process AS c_process,
            c.priority AS c_priority,
            acs.date_event AS c_current_process_datetime,
            l.id AS l_id,
            l.name AS l_name,
            l.qty AS l_qty,
            prd.code AS prd_code,
            ptn.name AS c_partner_name,
            rup.name  AS c_user_name
       FROM sn_sales_commandes c
       JOIN sn_sales_commande_lines l ON l.commande_id = c.id
       LEFT JOIN sn_sales_product prd ON prd.id = l.product_id
       LEFT JOIN sn_sales_partner ptn ON ptn.id = c.partner_id
       LEFT JOIN res_users ru ON ru.id = c.user_id
       LEFT JOIN res_partner rup ON rup.id = ru.partner_id
       LEFT JOIN LATERAL (
         SELECT date_event
           FROM albelt_cmd_suivi
          WHERE commande_id = c.id
            AND cmd_state = c.current_process
          ORDER BY date_event DESC
          LIMIT 1
       ) acs ON true
      WHERE c.current_process = $1::text
        AND c.atelier = $2::text
      ORDER BY
        -- For current_process = '1', sort by priority descending (3, 2, 1, …)
        -- with NULLs last. For other statuses this key collapses to NULL and
        -- has no effect on ordering.
        CASE WHEN c.current_process = '1' THEN c.priority END DESC NULLS LAST,
        -- For current_process = '3' (completed), surface the most recently
        -- completed commande first (LIFO by date_event). For other statuses
        -- this key collapses to NULL and has no effect on ordering.
        CASE WHEN c.current_process = '3' THEN acs.date_event END DESC NULLS LAST,
        c.id DESC, l.id DESC`,
    [currentProcess, atelierCode]
  );

  const byCommande = new Map<number, BonAtelierCommande>();
  for (const row of result.rows) {
    let cmd = byCommande.get(row.c_id);
    if (!cmd) {
      cmd = {
        id: row.c_id,
        name: row.c_name,
        atelier: row.c_atelier,
        current_process: row.c_process,
        priority: row.c_priority,
        current_process_datetime: row.c_current_process_datetime,
        partner_name: row.c_partner_name,
        user_name: row.c_user_name,
        lines: [],
      };
      byCommande.set(row.c_id, cmd);
    }
    const line: BonAtelierLine = {
      line_id: row.l_id,
      product_code: row.prd_code,
      name: row.l_name,
      qty: Number(row.l_qty),
    };
    cmd.lines.push(line);
  }

  return Array.from(byCommande.values());
}

/**
 * Count commandes per current_process for a given atelier (by code).
 * Returns a map { "1": n, "2": n, "3": n }.
 */
export async function countBonsAtelierByStatus(
  atelierCode: string
): Promise<Record<string, number>> {
  const result = await odooPool.query<{ current_process: string; count: string }>(
    `SELECT current_process, COUNT(*)::text AS count
       FROM sn_sales_commandes
      WHERE atelier = $1::text
        AND current_process IN ('1', '2', '3')
      GROUP BY current_process`,
    [atelierCode]
  );
  const counts: Record<string, number> = { "1": 0, "2": 0, "3": 0 };
  for (const row of result.rows) {
    counts[row.current_process] = Number(row.count);
  }
  return counts;
}

/**
 * Read the current_process of a single commande.
 * Returns null if the commande is not found.
 */
export async function getCommandeProcess(
  id: number
): Promise<{ current_process: string } | null> {
  const result = await odooPool.query<{ current_process: string }>(
    `SELECT current_process FROM sn_sales_commandes WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

/**
 * Update sn_sales_commandes.current_process for a single commande.
 * Uses a passed-in pg client so the caller can wrap multiple
 * operations in a single transaction.
 * Returns the number of rows updated (0 if id not found).
 */
export async function advanceCommandeProcess(
  client: PoolClient,
  id: number,
  nextProcess: string
): Promise<number> {
  const result = await client.query(
    `UPDATE sn_sales_commandes
        SET current_process = $2
      WHERE id = $1`,
    [id, nextProcess]
  );
  return result.rowCount ?? 0;
}

export interface InsertCmdSuiviInput {
  commandeId: number;
  userId: number;
  cmdState: string;
}

/**
 * Insert a row into albelt_cmd_suivi tracking the current_process change.
 * date_event is set to NOW() at the database level.
 * Uses a passed-in pg client so the caller can wrap the operation
 * in a transaction with the commande update.
 */
export async function insertCmdSuivi(
  client: PoolClient,
  input: InsertCmdSuiviInput
): Promise<{ id: number; date_event: string }> {
  const result = await client.query<{ id: number; date_event: string }>(
    `INSERT INTO albelt_cmd_suivi (commande_id, user_id, cmd_state, date_event)
     VALUES ($1, $2, $3, NOW())
     RETURNING id, date_event`,
    [input.commandeId, input.userId, input.cmdState]
  );
  return result.rows[0];
}