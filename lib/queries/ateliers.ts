import { query, queryOne } from "@/lib/db";
import type {
  Atelier,
  MembershipRole,
  NewAtelierInput,
  UpdateAtelierInput,
} from "@/lib/types";

interface AtelierRow {
  [k: string]: unknown;
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  date_creation: string;
}

export async function findAtelierById(id: number): Promise<Atelier | null> {
  const row = await queryOne<AtelierRow>(
    `SELECT id, code, name, is_active, date_creation
       FROM albelt_atelier
      WHERE id = $1
      LIMIT 1`,
    [id]
  );
  return row ?? null;
}

export async function isAtelierNameTaken(
  name: string,
  exceptId?: number
): Promise<boolean> {
  const row = await queryOne<{ id: number }>(
    `SELECT id FROM albelt_atelier
      WHERE name = $1 AND ($2::int IS NULL OR id <> $2)
      LIMIT 1`,
    [name, exceptId ?? null]
  );
  return row != null;
}

export interface ListAteliersOptions {
  search?: string;
  active?: boolean | null;
  sort?: "name" | "date_creation";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listAteliers(
  opts: ListAteliersOptions = {}
): Promise<{ items: Atelier[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const sort = opts.sort === "name" ? "name" : "date_creation";
  const order = opts.order === "asc" ? "ASC" : "DESC";
  const search = (opts.search ?? "").trim();
  const active = opts.active ?? null;

  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`name ILIKE $${params.length}`);
  }
  if (active !== null) {
    params.push(active);
    where.push(`is_active = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM albelt_atelier ${whereSql}`,
    params
  );
  const total = totalRow ? Number(totalRow.count) : 0;

  const offset = (page - 1) * pageSize;
  const limitParams = [...params, pageSize, offset];
  const rows = await query<AtelierRow>(
    `SELECT id, code, name, is_active, date_creation
       FROM albelt_atelier
       ${whereSql}
       ORDER BY ${sort} ${order}
       LIMIT $${limitParams.length - 1} OFFSET $${limitParams.length}`,
    limitParams
  );

  return { items: rows, total };
}

export async function createAtelier(
  input: NewAtelierInput
): Promise<Atelier> {
  const row = await queryOne<AtelierRow>(
    `INSERT INTO albelt_atelier (code, name, is_active)
     VALUES ($1, $2, $3)
     RETURNING id, code, name, is_active, date_creation`,
    [input.code, input.name, input.is_active ?? true]
  );
  if (!row) throw new Error("Failed to create atelier");
  return row;
}

export async function updateAtelier(
  id: number,
  input: UpdateAtelierInput
): Promise<Atelier | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (col: string, value: unknown) => {
    params.push(value);
    sets.push(`${col} = $${params.length}`);
  };

  if (input.code !== undefined) push("code", input.code);
  if (input.name !== undefined) push("name", input.name);
  if (input.is_active !== undefined) push("is_active", input.is_active);

  if (sets.length === 0) return findAtelierById(id);

  params.push(id);
  const row = await queryOne<AtelierRow>(
    `UPDATE albelt_atelier
        SET ${sets.join(", ")}
      WHERE id = $${params.length}
     RETURNING id, code, name, is_active, date_creation`,
    params
  );
  return row ?? null;
}

export async function deleteAtelier(id: number): Promise<boolean> {
  const row = await queryOne<{ id: number }>(
    `DELETE FROM albelt_atelier WHERE id = $1 RETURNING id`,
    [id]
  );
  return row != null;
}

/**
 * Return the ateliers a user is allowed to see/use.
 * Masters see all active ateliers; manager/user see only assigned ones.
 */
export async function listAteliersForUser(
  userId: number,
  role: MembershipRole,
  opts: Omit<ListAteliersOptions, "page" | "pageSize"> & { pageSize?: number } = {}
): Promise<Atelier[]> {
  if (role === "master") {
    const result = await listAteliers({
      ...opts,
      active: true,
      sort: "name",
      order: "asc",
      pageSize: opts.pageSize ?? 100,
    });
    return result.items;
  }

  const search = (opts.search ?? "").trim();
  const params: unknown[] = [userId];
  const where: string[] = ["a.is_active = true"];
  if (search) {
    params.push(`%${search}%`);
    where.push(`a.name ILIKE $${params.length}`);
  }

  const rows = await query<AtelierRow>(
    `SELECT a.id, a.code, a.name, a.is_active, a.date_creation
       FROM albelt_atelier a
       JOIN albelt_membership_atelier ma ON ma.atelier_id = a.id
      WHERE ma.membership_id = $1 AND ${where.join(" AND ")}
      ORDER BY a.name ASC`,
    params
  );
  return rows;
}

/**
 * Look up an atelier by its exact name.
 * Returns `null` when no atelier with that name exists.
 */
export async function findAtelierByName(
  name: string
): Promise<Atelier | null> {
  const row = await queryOne<AtelierRow>(
    `SELECT id, code, name, is_active, date_creation
       FROM albelt_atelier
      WHERE name = $1
      LIMIT 1`,
    [name]
  );
  return row ?? null;
}