import { query, queryOne } from "@/lib/db";
import { computeCategoryName } from "@/lib/bobine-category-options";
import type { Category, NewCategoryInput, UpdateCategoryInput } from "@/lib/types";

interface CategoryRow {
  [k: string]: unknown;
  id: number;
  name: string | null;
  nature: string;
  color: string;
  plies: string;
  thickness: string;
  motif: string;
  pays: string | null;
  si_active: boolean;
}

function toCategory(row: CategoryRow): Category {
  return {
    id: Number(row.id),
    name: String(row.name ?? ""),
    nature: String(row.nature ?? ""),
    color: String(row.color ?? ""),
    plies: String(row.plies ?? ""),
    thickness: String(row.thickness ?? ""),
    motif: String(row.motif ?? ""),
    pays: row.pays == null ? null : String(row.pays),
    si_active: Boolean(row.si_active),
  };
}

export async function getAllCategories(): Promise<Category[]> {
  const rows = await query<CategoryRow>(
    `SELECT id, name, nature, color, plies, thickness, motif, pays, si_active
     FROM albelt_stocks_categories
     ORDER BY name NULLS LAST, id ASC`
  );
  return rows.map(toCategory);
}

export async function findCategoryById(id: number): Promise<Category | null> {
  const row = await queryOne<CategoryRow>(
    `SELECT id, name, nature, color, plies, thickness, motif, pays, si_active
       FROM albelt_stocks_categories
      WHERE id = $1
      LIMIT 1`,
    [id]
  );
  return row ? toCategory(row) : null;
}

export interface ListCategoriesOptions {
  search?: string;
  sort?: "name" | "nature" | "id";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listCategories(
  opts: ListCategoriesOptions = {}
): Promise<{ items: Category[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const sort =
    opts.sort === "nature" ? "nature" : opts.sort === "name" ? "name" : "id";
  const order = opts.order === "asc" ? "ASC" : "DESC";
  const search = (opts.search ?? "").trim();

  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(name ILIKE $${params.length} OR nature ILIKE $${params.length} OR color ILIKE $${params.length} OR motif ILIKE $${params.length} OR pays ILIKE $${params.length})`
    );
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM albelt_stocks_categories ${whereSql}`,
    params
  );
  const total = totalRow ? Number(totalRow.count) : 0;

  const offset = (page - 1) * pageSize;
  const limitParams = [...params, pageSize, offset];
  const rows = await query<CategoryRow>(
    `SELECT id, name, nature, color, plies, thickness, motif, pays, si_active
       FROM albelt_stocks_categories
       ${whereSql}
       ORDER BY ${sort} ${order} NULLS LAST
       LIMIT $${limitParams.length - 1} OFFSET $${limitParams.length}`,
    limitParams
  );

  return { items: rows.map(toCategory), total };
}

export async function isCategoryDuplicate(
  input: {
    nature: string;
    color: string;
    plies: string;
    thickness: string;
    motif: string;
    pays?: string | null;
  },
  exceptId?: number
): Promise<boolean> {
  const pays =
    input.pays != null && String(input.pays).trim() !== ""
      ? String(input.pays).trim()
      : null;
  const row = await queryOne<{ id: number }>(
    `SELECT id FROM albelt_stocks_categories
      WHERE nature = $1 AND color = $2 AND plies = $3 AND thickness = $4 AND motif = $5
        AND pays IS NOT DISTINCT FROM $6
        AND ($7::int IS NULL OR id <> $7)
      LIMIT 1`,
    [input.nature, input.color, input.plies, input.thickness, input.motif, pays, exceptId ?? null]
  );
  return row != null;
}

export async function createCategory(
  input: NewCategoryInput
): Promise<Category> {
  const pays =
    input.pays != null && String(input.pays).trim() !== ""
      ? String(input.pays).trim()
      : null;
  const name = computeCategoryName({ ...input, pays });
  if (!name) throw new Error("Invalid category field values");
  const siActive = input.si_active ?? false;
  const row = await queryOne<CategoryRow>(
    `INSERT INTO albelt_stocks_categories
        (name, nature, color, plies, thickness, motif, pays, si_active, create_date, write_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
     RETURNING id, name, nature, color, plies, thickness, motif, pays, si_active`,
    [name, input.nature, input.color, input.plies, input.thickness, input.motif, pays, siActive]
  );
  if (!row) throw new Error("Failed to create category");
  return toCategory(row);
}

export async function updateCategory(
  id: number,
  input: UpdateCategoryInput
): Promise<Category | null> {
  const existing = await findCategoryById(id);
  if (!existing) return null;

  const pays =
    input.pays !== undefined
      ? (input.pays != null && String(input.pays).trim() !== ""
          ? String(input.pays).trim()
          : null)
      : existing.pays;

  const merged = {
    nature: input.nature ?? existing.nature,
    color: input.color ?? existing.color,
    plies: input.plies ?? existing.plies,
    thickness: input.thickness ?? existing.thickness,
    motif: input.motif ?? existing.motif,
    pays,
  };
  const name = computeCategoryName(merged);
  if (!name) throw new Error("Invalid category field values");

  const siActive = input.si_active !== undefined ? input.si_active : existing.si_active;

  const row = await queryOne<CategoryRow>(
    `UPDATE albelt_stocks_categories
        SET name = $1, nature = $2, color = $3, plies = $4, thickness = $5, motif = $6,
            pays = $7, si_active = $8, write_date = NOW()
      WHERE id = $9
     RETURNING id, name, nature, color, plies, thickness, motif, pays, si_active`,
    [name, merged.nature, merged.color, merged.plies, merged.thickness, merged.motif, pays, siActive, id]
  );
  return row ? toCategory(row) : null;
}

export async function deleteCategory(id: number): Promise<boolean> {
  const row = await queryOne<{ id: number }>(
    `DELETE FROM albelt_stocks_categories WHERE id = $1 RETURNING id`,
    [id]
  );
  return row != null;
}

/**
 * Synchronise la ligne SI (Stock Initial) pour une catégorie.
 *
 * Quand `siActive` est true :
 *  - Cherche une ligne dans albelt_stocks avec name = 'SI_<categoryName>'
 *  - Si trouvée : met is_consumed à false (la rend active)
 *  - Si non trouvée : crée la ligne avec type='SI'
 *
 * Quand `siActive` est false :
 *  - Cherche la ligne SI et met is_consumed à true
 */
export async function syncSiStockForCategory(
  categoryId: number,
  siActive: boolean,
  categoryName: string
): Promise<void> {
  const siName = `SI_${categoryName}`;

  if (siActive) {
    // Cherche une ligne SI existante pour cette catégorie
    const existing = await queryOne<{ id: number }>(
      `SELECT id FROM albelt_stocks
        WHERE name = $1 AND type = 'SI' AND stk_category_id = $2
        LIMIT 1`,
      [siName, categoryId]
    );

    if (existing) {
      // Réactive la ligne existante
      await query(
        `UPDATE albelt_stocks
            SET is_consumed = false, write_date = NOW()
          WHERE id = $1`,
        [existing.id]
      );
    } else {
      // Crée une nouvelle ligne SI
      await query(
        `INSERT INTO albelt_stocks
            (name, type, stk_category_id, longueur, largeur, cute_x, cute_y,
             atelier, is_consumed, create_date, write_date)
         VALUES ($1, 'SI', $2, 0, 0, 0, 0,
                 '', false, NOW(), NOW())`,
        [siName, categoryId]
      );
    }
  } else {
    // Désactive la ligne SI
    await query(
      `UPDATE albelt_stocks
          SET is_consumed = true, write_date = NOW()
        WHERE name = $1 AND type = 'SI' AND stk_category_id = $2`,
      [siName, categoryId]
    );
  }
}
