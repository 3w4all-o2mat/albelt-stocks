import pool, { query, queryOne } from "@/lib/db";
import type {
  Ancestor,
  BO,
  NewBOInput,
  NewCutInput,
  NewSIInput,
  PieceType,
  StockPiece,
  Supplier,
} from "@/lib/types";

/**
 * Map a raw DB row (with joined category columns prefixed cat_*) into a
 * StockPiece with a nested `category` object.
 */
function mapPiece(row: Record<string, unknown>): StockPiece {
  const category = row.cat_name
    ? {
        id: Number(row.stk_category_id),
        name: String(row.cat_name),
        nature: String(row.nature ?? ""),
        color: String(row.color ?? ""),
        plies: String(row.plies ?? ""),
        thickness: String(row.thickness ?? ""),
        motif: String(row.motif ?? ""),
        pays: row.pays == null ? null : String(row.pays),
      }
    : undefined;

  const supplier =
    row.sup_id != null
      ? ({
          id: Number(row.sup_id),
          name: String(row.sup_name ?? ""),
          country_code: String(row.sup_country_code ?? ""),
          country_name: (row.sup_country_name as string | undefined) ?? undefined,
          is_active: Boolean(row.sup_is_active ?? true),
          date_creation: String(row.sup_date_creation ?? ""),
        } as Supplier)
      : undefined;

  return {
    id: Number(row.id),
    name: (row.name as string | null) ?? null,
    chained_name: (row.chained_name as string | null) ?? null,
    reference: (row.reference as string | null) ?? null,
    type: row.type as StockPiece["type"],
    stk_category_id: Number(row.stk_category_id),
    category,
    sequence: row.sequence == null ? null : Number(row.sequence),
    parent_id: row.parent_id == null ? null : Number(row.parent_id),
    longueur: Number(row.longueur),
    largeur: Number(row.largeur),
    cute_x: Number(row.cute_x),
    cute_y: Number(row.cute_y),
    surface: row.surface == null ? null : Number(row.surface),
    surface_restante:
      row.surface_restante == null ? null : Number(row.surface_restante),
    atelier: String(row.atelier ?? ""),
    user_id: row.user_id == null ? null : Number(row.user_id),
    company_id: row.company_id == null ? null : Number(row.company_id),
    is_consumed: (row.is_consumed as boolean | null) ?? null,
    observation: (row.observation as string | null) ?? null,
    cmd_id: row.cmd_id == null ? null : Number(row.cmd_id),
    cmd_name: (row.cmd_name as string | null) ?? null,
    cmd_date: (row.cmd_date as string | null) ?? null,
    client_name: (row.client_name as string | null) ?? null,
    line_designation: (row.line_designation as string | null) ?? null,
    line_qty: row.line_qty == null ? null : Number(row.line_qty),
    create_uid: row.create_uid == null ? null : Number(row.create_uid),
    create_date: (row.create_date as string | null) ?? null,
    write_uid: row.write_uid == null ? null : Number(row.write_uid),
    write_date: (row.write_date as string | null) ?? null,
    user_full_name: (row.user_full_name as string | null) ?? null,
    user_username: (row.user_username as string | null) ?? null,
    supplier_id: row.supplier_id == null ? null : Number(row.supplier_id),
    supplier,
    year: row.year == null ? null : Number(row.year),
  } as StockPiece;
}

const CATEGORY_JOIN = `
  LEFT JOIN albelt_stocks_categories c ON s.stk_category_id = c.id
`;

const SUPPLIER_JOIN = `
  LEFT JOIN albelt_supplier sup ON s.supplier_id = sup.id
  LEFT JOIN albelt_country supc ON sup.country_code = supc.code
`;

const CATEGORY_COLS = `
  c.name AS cat_name, c.nature, c.color, c.thickness, c.plies, c.motif, c.pays
`;

const SUPPLIER_COLS = `
  sup.id AS sup_id,
  sup.name AS sup_name,
  sup.country_code AS sup_country_code,
  supc.name_fr AS sup_country_name,
  sup.is_active AS sup_is_active,
  sup.date_creation AS sup_date_creation
`;

const COMMANDE_JOIN = `
  LEFT JOIN albelt_commandes cmd ON s.cmd_id = cmd.cmd_id
  LEFT JOIN albelt_clients cl ON cmd.client_id = cl.id
  LEFT JOIN albelt_commandes_lines l ON s.line_id = l.line_id
`;

const COMMANDE_COLS = `
  cmd.cmd_date AS cmd_date,
  cl.name AS client_name,
  l.line_designation,
  l.line_qty
`;

export type BOFilterOptions = {
  nature?: string;
  color?: string;
  plies?: string;
  thickness?: string;
  supplierId?: number;
  countryCode?: string;
  year?: number;
};

export async function getAllBOs(
  atelier?: string | null,
  consumed?: "active" | "consumed" | "all" | null,
  allowedAteliers?: string[],
  filters?: BOFilterOptions
): Promise<BO[]> {
  const params: unknown[] = [];
  const where: string[] = [`s.type = 'BO'`];
  if (atelier) {
    params.push(atelier);
    where.push(`s.atelier = $${params.length}`);
  }
  if (allowedAteliers !== undefined) {
    params.push(allowedAteliers);
    where.push(`s.atelier = ANY($${params.length})`);
  }
  if (consumed === "active") {
    where.push(`COALESCE(s.is_consumed, false) = false`);
  } else if (consumed === "consumed") {
    where.push(`COALESCE(s.is_consumed, false) = true`);
  }
  if (filters) {
    if (filters.nature) {
      params.push(filters.nature);
      where.push(`c.nature ILIKE $${params.length}`);
    }
    if (filters.color) {
      params.push(filters.color);
      where.push(`c.color ILIKE $${params.length}`);
    }
    if (filters.plies) {
      params.push(filters.plies);
      where.push(`c.plies ILIKE $${params.length}`);
    }
    if (filters.thickness) {
      params.push(filters.thickness);
      where.push(`c.thickness ILIKE $${params.length}`);
    }
    if (filters.supplierId) {
      params.push(filters.supplierId);
      where.push(`s.supplier_id = $${params.length}`);
    }
    if (filters.countryCode) {
      params.push(filters.countryCode);
      where.push(`sup.country_code = $${params.length}`);
    }
    if (filters.year) {
      params.push(filters.year);
      where.push(`s.year = $${params.length}`);
    }
  }
  const rows = await query(
    `SELECT s.*, ${CATEGORY_COLS}, ${SUPPLIER_COLS}
     FROM albelt_stocks s
     ${CATEGORY_JOIN}
     ${SUPPLIER_JOIN}
     WHERE ${where.join(" AND ")}
     ORDER BY s.create_date DESC NULLS LAST, s.id DESC`,
    params
  );
  return rows.map((r) => mapPiece(r) as BO);
}

export async function getPieceById(id: number): Promise<StockPiece | null> {
  const row = await queryOne(
    `SELECT s.*, ${CATEGORY_COLS}, ${SUPPLIER_COLS}, ${COMMANDE_COLS}
     FROM albelt_stocks s
     ${CATEGORY_JOIN}
     ${SUPPLIER_JOIN}
     ${COMMANDE_JOIN}
     WHERE s.id = $1`,
    [id]
  );
  return row ? mapPiece(row) : null;
}

export async function getChildren(parentId: number): Promise<StockPiece[]> {
  const rows = await query(
    `SELECT s.*, ${CATEGORY_COLS}, ${SUPPLIER_COLS}, ${COMMANDE_COLS}, m.full_name AS user_full_name, m.username AS user_username
     FROM albelt_stocks s
     ${CATEGORY_JOIN}
     ${SUPPLIER_JOIN}
     ${COMMANDE_JOIN}
     LEFT JOIN albelt_membership m ON s.user_id = m.id
     WHERE s.parent_id = $1
     ORDER BY s.id DESC`,
    [parentId]
  );
  return rows.map((r) => mapPiece(r));
}

export async function getAncestors(id: number): Promise<Ancestor[]> {
  const rows = await query(
    `WITH RECURSIVE ancestors AS (
       SELECT id, name, chained_name, type, parent_id, 0 AS depth
       FROM albelt_stocks WHERE id = $1
       UNION ALL
       SELECT s.id, s.name, s.chained_name, s.type, s.parent_id, a.depth + 1
       FROM albelt_stocks s
       JOIN ancestors a ON s.id = a.parent_id
     )
     SELECT * FROM ancestors ORDER BY depth DESC`,
    [id]
  );
  return rows as unknown as Ancestor[];
}

export async function getRecentCuts(
  limit = 20,
  atelier?: string | null,
  allowedAteliers?: string[]
): Promise<StockPiece[]> {
  const params: unknown[] = [];
  const where: string[] = [`s.type IN ('CC', 'CS', 'CP')`];
  if (atelier) {
    params.push(atelier);
    where.push(`s.atelier = $${params.length}`);
  }
  if (allowedAteliers !== undefined) {
    params.push(allowedAteliers);
    where.push(`s.atelier = ANY($${params.length})`);
  }
  params.push(limit);
  const rows = await query(
    `SELECT s.*, ${CATEGORY_COLS}, ${COMMANDE_COLS}
     FROM albelt_stocks s
     ${CATEGORY_JOIN}
     ${COMMANDE_JOIN}
     WHERE ${where.join(" AND ")}
     ORDER BY s.create_date DESC NULLS LAST, s.id DESC
     LIMIT $${params.length}`,
    params
  );
  return rows.map((r) => mapPiece(r));
}

export interface GetCutsByTypeOptions {
  /** Restrict to a single atelier (by name). */
  atelier?: string | null;
  /** Restrict to a list of allowed atelier names. */
  allowedAteliers?: string[];
  /** Filter by commande name (CC only). */
  cmdName?: string | null;
  /** Filter by client name (CC only). */
  clientName?: string | null;
}

export async function getCutsByType(
  type: "CC" | "CS" | "CP" | "SI",
  options: GetCutsByTypeOptions = {}
): Promise<StockPiece[]> {
  const params: unknown[] = [type];
  const where: string[] = [`s.type = $1`];
  if (options.atelier) {
    params.push(options.atelier);
    where.push(`s.atelier = $${params.length}`);
  }
  if (options.allowedAteliers !== undefined) {
    params.push(options.allowedAteliers);
    where.push(`s.atelier = ANY($${params.length})`);
  }
  if (options.cmdName) {
    params.push(`%${options.cmdName}%`);
    where.push(`s.cmd_name ILIKE $${params.length}`);
  }
  if (options.clientName) {
    params.push(`%${options.clientName}%`);
    where.push(`cl.name ILIKE $${params.length}`);
  }
  const rows = await query(
    `SELECT s.*, ${CATEGORY_COLS}, ${COMMANDE_COLS}
     FROM albelt_stocks s
     ${CATEGORY_JOIN}
     ${COMMANDE_JOIN}
     WHERE ${where.join(" AND ")}
     ORDER BY s.create_date DESC NULLS LAST, s.id DESC`,
    params
  );
  return rows.map((r) => mapPiece(r));
}

export async function getDashboardKpis(
  atelier?: string | null,
  allowedAteliers?: string[]
) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (atelier) {
    params.push(atelier);
    conditions.push(`atelier = $${params.length}`);
  }
  if (allowedAteliers !== undefined) {
    params.push(allowedAteliers);
    conditions.push(`atelier = ANY($${params.length})`);
  }
  const whereClause = conditions.length
    ? ` AND ${conditions.join(" AND ")}`
    : "";

  const bos = await queryOne<{ count: string; total_surface: string | null }>(
    `SELECT COUNT(*)::text AS count, COALESCE(SUM(longueur::bigint * largeur::bigint), 0)::text AS total_surface
     FROM albelt_stocks WHERE type = 'BO'${whereClause}`,
    params
  );
  const consumed = await queryOne<{ total: string | null }>(
    `SELECT COALESCE(SUM(surface), 0)::text AS total
     FROM albelt_stocks WHERE type = 'BO' AND is_consumed = true${whereClause}`,
    params
  );
  const cutSurface = await queryOne<{ total: string | null }>(
    `SELECT COALESCE(SUM(surface::bigint), 0)::text AS total
     FROM albelt_stocks WHERE type IN ('CC', 'CS', 'CP')${whereClause}`,
    params
  );
  const boRemainingSurface = await queryOne<{ total: string | null }>(
    `SELECT COALESCE(SUM(surface_restante::bigint), 0)::text AS total
     FROM albelt_stocks WHERE type = 'BO'${whereClause}`,
    params
  );
  const cs = await queryOne<{
    count: string;
    total_restante: string | null;
    total_surface: string | null;
  }>(
    `SELECT COUNT(*)::text AS count,
            COALESCE(SUM(surface_restante::bigint), 0)::text AS total_restante,
            COALESCE(SUM(surface::bigint), 0)::text AS total_surface
     FROM albelt_stocks WHERE type = 'CS' AND COALESCE(is_consumed, false) = false${whereClause}`,
    params
  );
  const cp = await queryOne<{ total: string | null; count: string }>(
    `SELECT COALESCE(SUM(surface::bigint), 0)::text AS total, COUNT(*)::text AS count
     FROM albelt_stocks WHERE type = 'CP'${whereClause}`,
    params
  );
  const cc = await queryOne<{ total: string | null; count: string }>(
    `SELECT COALESCE(SUM(longueur::bigint * largeur::bigint), 0)::text AS total, COUNT(*)::text AS count
     FROM albelt_stocks WHERE type = 'CC'${whereClause}`,
    params
  );
  const si = await queryOne<{ total: string | null; count: string }>(
    `SELECT COALESCE(SUM(longueur::bigint * largeur::bigint), 0)::text AS total, COUNT(*)::text AS count
     FROM albelt_stocks WHERE type = 'SI'${whereClause}`,
    params
  );

  return {
    boCount: Number(bos?.count ?? 0),
    boTotalSurface: Number(bos?.total_surface ?? 0),
    consumedSurface: Number(consumed?.total ?? 0),
    cutSurface: Number(cutSurface?.total ?? 0),
    boRemainingSurface: Number(boRemainingSurface?.total ?? 0),
    csCount: Number(cs?.count ?? 0),
    csRemainingSurface: Number(cs?.total_restante ?? 0),
    csTotalSurface: Number(cs?.total_surface ?? 0),
    cpCount: Number(cp?.count ?? 0),
    cpLostSurface: Number(cp?.total ?? 0),
    ccCount: Number(cc?.count ?? 0),
    ccTotalSurface: Number(cc?.total ?? 0),
    siCount: Number(si?.count ?? 0),
    siTotalSurface: Number(si?.total ?? 0),
  };
}

export async function createBO(input: NewBOInput): Promise<StockPiece> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch the category name for the naming convention.
    const catRes = await client.query(
      `SELECT name FROM albelt_stocks_categories WHERE id = $1`,
      [input.stk_category_id]
    );
    const categoryName = (catRes.rows[0]?.name as string | undefined) ?? "UNKNOWN";

    // Compute the next sequence number for BOs in this category.
    const countRes = await client.query(
      `SELECT COUNT(*)::int AS count
         FROM albelt_stocks
        WHERE type = 'BO' AND stk_category_id = $1`,
      [input.stk_category_id]
    );
    const nextSeq = Number(countRes.rows[0]?.count ?? 0) + 1;
    const seqStr = String(nextSeq).padStart(3, "0");
    const name = `BO_${categoryName}_${seqStr}`;

    const surface = Math.floor((input.longueur * input.largeur) / 1000000);

    const insertRes = await client.query(
      `INSERT INTO albelt_stocks
         (type, stk_category_id, parent_id, longueur, largeur, cute_x, cute_y,
          atelier, user_id, company_id, observation, name, chained_name,
          surface, surface_restante,
          supplier_id, year,
          create_uid, create_date, write_uid, write_date)
       VALUES
         ('BO', $1, NULL, $2, $3, 0, 0,
          $4, $5, $6, $7, $8, $8,
          $9, $9,
          $10, $11,
          $12, NOW(), $12, NOW())
       RETURNING *`,
      [
        input.stk_category_id,
        input.longueur,
        input.largeur,
        input.atelier,
        input.user_id,
        input.company_id,
        input.observation ?? null,
        name,
        surface,
        input.supplier_id ?? null,
        input.year ?? null,
        input.create_uid,
      ]
    );

    await client.query("COMMIT");
    return mapPiece(insertRes.rows[0] as Record<string, unknown>);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function createCut(input: NewCutInput): Promise<StockPiece> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch the compact category name for the naming convention.
    const catRes = await client.query(
      `SELECT name FROM albelt_stocks_categories WHERE id = $1`,
      [input.stk_category_id]
    );
    const categoryName = (catRes.rows[0]?.name as string | undefined) ?? "UNKNOWN";

    // Compute the next sequence number for this cut type (CC, CS or CP).
    const seqRes = await client.query(
      `SELECT COALESCE(MAX(sequence), 0)::int AS max_seq
         FROM albelt_stocks
        WHERE type = $1`,
      [input.type]
    );
    const nextSeq = Number(seqRes.rows[0]?.max_seq ?? 0) + 1;
    const seqStr = String(nextSeq).padStart(3, "0");
    const name = `${input.type}_${categoryName}_${seqStr}`;

    const surface = Math.floor((input.longueur * input.largeur) / 1_000_000);

    const insertRes = await client.query(
      `INSERT INTO albelt_stocks
         (type, stk_category_id, parent_id, longueur, largeur, cute_x, cute_y,
          cmd_id, cmd_name, line_id, atelier, user_id, company_id,
          name, sequence, surface, surface_restante,
          observation, create_uid, create_date, write_uid, write_date)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $16,
          $17, $18, NOW(), $18, NOW())
       RETURNING *`,
      [
        input.type,
        input.stk_category_id,
        input.parent_id,
        input.longueur,
        input.largeur,
        input.cute_x,
        input.cute_y,
        input.cmd_id ?? null,
        input.cmd_name ?? null,
        input.line_id ?? null,
        input.atelier,
        input.user_id,
        input.company_id,
        name,
        nextSeq,
        surface,
        input.observation ?? null,
        input.create_uid,
      ]
    );

    // Recalculate parent surface_restante = parent surface - SUM(all children surfaces)
    const parentRes = await client.query(
      `SELECT surface FROM albelt_stocks WHERE id = $1`,
      [input.parent_id]
    );
    if (parentRes.rows.length > 0) {
      const parentSurface = Number(parentRes.rows[0].surface ?? 0);
      const sumRes = await client.query(
        `SELECT COALESCE(SUM(surface), 0)::int AS total FROM albelt_stocks WHERE parent_id = $1`,
        [input.parent_id]
      );
      const childrenSurface = Number(sumRes.rows[0].total ?? 0);
      await client.query(
        `UPDATE albelt_stocks SET surface_restante = $1, write_date = NOW() WHERE id = $2`,
        [parentSurface - childrenSurface, input.parent_id]
      );
    }

    await client.query("COMMIT");

    return mapPiece(insertRes.rows[0] as Record<string, unknown>);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function deletePiece(id: number): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Fetch parent_id before deleting
    const pieceRes = await client.query(
      `SELECT parent_id FROM albelt_stocks WHERE id = $1`,
      [id]
    );
    const parentId = pieceRes.rows[0]?.parent_id;

    await client.query(`DELETE FROM albelt_stocks WHERE id = $1`, [id]);

    // Recalculate parent surface_restante = parent surface - SUM(all remaining children surfaces)
    if (parentId != null) {
      const parentRes = await client.query(
        `SELECT surface FROM albelt_stocks WHERE id = $1`,
        [parentId]
      );
      if (parentRes.rows.length > 0) {
        const parentSurface = Number(parentRes.rows[0].surface ?? 0);
        const sumRes = await client.query(
          `SELECT COALESCE(SUM(surface), 0)::int AS total FROM albelt_stocks WHERE parent_id = $1`,
          [parentId]
        );
        const childrenSurface = Number(sumRes.rows[0].total ?? 0);
        await client.query(
          `UPDATE albelt_stocks SET surface_restante = $1, write_date = NOW() WHERE id = $2`,
          [parentSurface - childrenSurface, parentId]
        );
      }
    }

    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Returns the distinct years present among BO (bobine) records.
 * Used to populate the year filter dropdown.
 */
export async function getDistinctBOYears(): Promise<number[]> {
  const rows = await query<{ year: number }>(
    `SELECT DISTINCT year FROM albelt_stocks WHERE type = 'BO' AND year IS NOT NULL ORDER BY year DESC`
  );
  return rows.map((r) => r.year);
}

/**
 * Create a new SI (Stock Initial — initial stock piece) record.
 *
 * SI pieces are like BOs but with no supplier/year. The naming convention
 * mirrors BOs: `SI_<categoryName>_<zero-padded sequence>`.
 */
export async function createSI(input: NewSIInput): Promise<StockPiece> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const catRes = await client.query(
      `SELECT name FROM albelt_stocks_categories WHERE id = $1`,
      [input.stk_category_id]
    );
    const categoryName =
      (catRes.rows[0]?.name as string | undefined) ?? "UNKNOWN";

    const countRes = await client.query(
      `SELECT COUNT(*)::int AS count
         FROM albelt_stocks
        WHERE type = 'SI' AND stk_category_id = $1`,
      [input.stk_category_id]
    );
    const nextSeq = Number(countRes.rows[0]?.count ?? 0) + 1;
    const seqStr = String(nextSeq).padStart(3, "0");
    const name = `SI_${categoryName}_${seqStr}`;

    const surface = Math.floor((input.longueur * input.largeur) / 1_000_000);

    const insertRes = await client.query(
      `INSERT INTO albelt_stocks
         (type, stk_category_id, parent_id, longueur, largeur, cute_x, cute_y,
          atelier, user_id, company_id, observation, name, chained_name,
          surface, surface_restante,
          create_uid, create_date, write_uid, write_date)
       VALUES
         ('SI', $1, NULL, $2, $3, 0, 0,
          $4, $5, $6, $7, $8, $8,
          $9, $9,
          $10, NOW(), $10, NOW())
       RETURNING *`,
      [
        input.stk_category_id,
        input.longueur,
        input.largeur,
        input.atelier,
        input.user_id,
        input.company_id,
        input.observation ?? null,
        name,
        surface,
        input.create_uid,
      ]
    );

    await client.query("COMMIT");
    return mapPiece(insertRes.rows[0] as Record<string, unknown>);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Move a stock piece to a different atelier.
 * Returns the updated piece, or `null` if the id was not found.
 */
export async function updateStockAtelier(
  id: number,
  atelier: string
): Promise<StockPiece | null> {
  const row = await queryOne(
    `UPDATE albelt_stocks
        SET atelier = $1, write_date = NOW()
      WHERE id = $2
     RETURNING *`,
    [atelier, id]
  );
  if (!row) return null;
  // Re-fetch with joins so the returned object matches the StockPiece shape.
  return getPieceById(id);
}

/**
 * Find stock pieces (BO / SI / CS) that can accommodate a cut of the given
 * dimensions, optionally restricted to a specific atelier or a list of
 * allowed atelier names, and optionally narrowed by individual category
 * attributes (nature, color, plies, thickness, motif, pays).
 *
 * Each attribute filter is optional and combined with AND. An attribute that
 * is not provided (or an empty string) imposes no restriction on that
 * attribute. The lookup is by exact label match against
 * `albelt_stocks_categories` (e.g. `c.nature = 'Pvc'`).
 *
 * A piece is considered "available" if:
 *   - its type is one of BO / CS / SI,
 *   - it is not consumed,
 *   - it matches every provided category attribute (if any),
 *   - its remaining surface can fit the requested (longueur × largeur) area
 *     (the cut is rotated to fit either dimension pairing).
 *
 * The result is grouped server-side into `{ bo, cs, si }`. Each bucket is
 * capped at 50 rows, ordered by remaining surface DESC then id DESC.
 */
export type AvailabilityAttributeFilter = {
  nature?: string;
  color?: string;
  plies?: string;
  thickness?: string;
  motif?: string;
  pays?: string;
};

export type FindAvailableStockPiecesOptions = AvailabilityAttributeFilter & {
  longueur: number;
  largeur: number;
  atelier?: string | null;
  allowedAteliers?: string[];
};

export type AvailabilityBuckets = {
  bo: StockPiece[];
  cs: StockPiece[];
  si: StockPiece[];
};

const BUCKET_LIMIT = 50;
const ATTRIBUTE_TO_COLUMN: Record<keyof AvailabilityAttributeFilter, string> = {
  nature: "c.nature",
  color: "c.color",
  plies: "c.plies",
  thickness: "c.thickness",
  motif: "c.motif",
  pays: "c.pays",
};

function pushAttribute(
  where: string[],
  params: unknown[],
  key: keyof AvailabilityAttributeFilter,
  value: string | undefined
) {
  if (typeof value !== "string") return;
  const trimmed = value.trim();
  if (!trimmed) return;
  params.push(trimmed);
  where.push(`${ATTRIBUTE_TO_COLUMN[key]} = $${params.length}`);
}

export async function findAvailableStockPieces(
  opts: FindAvailableStockPiecesOptions
): Promise<AvailabilityBuckets> {
  const {
    longueur,
    largeur,
    atelier,
    allowedAteliers,
    nature,
    color,
    plies,
    thickness,
    motif,
    pays,
  } = opts;

  const params: unknown[] = [];
  const where: string[] = [
    `s.type IN ('BO', 'CS', 'SI')`,
    `COALESCE(s.is_consumed, false) = false`,
    // The piece must fit the requested cut in at least one orientation, with
    // enough remaining surface to cover the cut area. Cast parameters to
    // integer explicitly so PostgreSQL can infer the right type when these
    // parameters are first encountered inside GREATEST/LEAST.
    `s.longueur >= GREATEST($${(params.push(longueur), params.length)}::integer, $${(params.push(largeur), params.length)}::integer)`,
    `s.largeur >= LEAST($${(params.length - 1)}::integer, $${params.length}::integer)`,
    `(s.surface_restante IS NULL OR s.surface_restante >= ($${(params.push(longueur), params.length)}::bigint * $${(params.push(largeur), params.length)}::bigint / 1000000))`,
  ];

  pushAttribute(where, params, "nature", nature);
  pushAttribute(where, params, "color", color);
  pushAttribute(where, params, "plies", plies);
  pushAttribute(where, params, "thickness", thickness);
  pushAttribute(where, params, "motif", motif);
  pushAttribute(where, params, "pays", pays);

  if (atelier) {
    params.push(atelier);
    where.push(`s.atelier = $${params.length}`);
  }
  if (allowedAteliers !== undefined) {
    params.push(allowedAteliers);
    where.push(`s.atelier = ANY($${params.length})`);
  }

  const rows = await query(
    `SELECT s.*, ${CATEGORY_COLS}, ${SUPPLIER_COLS}, ${COMMANDE_COLS}
       FROM albelt_stocks s
       ${CATEGORY_JOIN}
       ${SUPPLIER_JOIN}
       ${COMMANDE_JOIN}
      WHERE ${where.join(" AND ")}
      ORDER BY s.surface_restante DESC NULLS LAST, s.id DESC`,
    params
  );

  const buckets: AvailabilityBuckets = { bo: [], cs: [], si: [] };
  for (const row of rows as Record<string, unknown>[]) {
    const piece = mapPiece(row);
    if (piece.type === "BO" && buckets.bo.length < BUCKET_LIMIT) {
      buckets.bo.push(piece);
    } else if (piece.type === "CS" && buckets.cs.length < BUCKET_LIMIT) {
      buckets.cs.push(piece);
    } else if (piece.type === "SI" && buckets.si.length < BUCKET_LIMIT) {
      buckets.si.push(piece);
    }
  }
  return buckets;
}

/**
 * Paginated listing of all stock pieces (used by the Entre-Ateliers admin).
 * Returns items + total count, optionally filtered by type.
 */
export async function listAllStocks(opts: {
  type?: PieceType | null;
  page?: number;
  pageSize?: number;
}): Promise<{ items: StockPiece[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 40));
  const offset = (page - 1) * pageSize;

  const params: unknown[] = [];
  const where: string[] = [];
  if (opts.type) {
    params.push(opts.type);
    where.push(`s.type = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM albelt_stocks s ${whereSql}`,
    params
  );
  const total = totalRow ? Number(totalRow.count) : 0;

  const rows = await query(
    `SELECT s.*, ${CATEGORY_COLS}, ${SUPPLIER_COLS}, ${COMMANDE_COLS}
       FROM albelt_stocks s
       ${CATEGORY_JOIN}
       ${SUPPLIER_JOIN}
       ${COMMANDE_JOIN}
       ${whereSql}
       ORDER BY s.create_date DESC NULLS LAST, s.id DESC
       LIMIT $${(params.push(pageSize), params.length)} OFFSET $${(params.push(offset), params.length)}`,
    params
  );

  return { items: rows.map((r) => mapPiece(r)), total };
}
