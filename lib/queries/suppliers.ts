import { query, queryOne } from "@/lib/db";
import type {
  Supplier,
  NewSupplierInput,
  UpdateSupplierInput,
} from "@/lib/types";

interface SupplierRow {
  [k: string]: unknown;
  id: number;
  name: string;
  country_code: string;
  country_name?: string;
  is_active: boolean;
  date_creation: string;
}

function mapSupplier(row: SupplierRow): Supplier {
  return {
    id: row.id,
    name: row.name,
    country_code: row.country_code,
    country_name: row.country_name as string | undefined,
    is_active: row.is_active,
    date_creation: row.date_creation,
  };
}

export async function findSupplierById(id: number): Promise<Supplier | null> {
  const row = await queryOne<SupplierRow>(
    `SELECT s.id, s.name, s.country_code, c.name_fr AS country_name,
            s.is_active, s.date_creation
       FROM albelt_supplier s
       LEFT JOIN albelt_country c ON s.country_code = c.code
      WHERE s.id = $1
      LIMIT 1`,
    [id]
  );
  return row ? mapSupplier(row) : null;
}

export async function isSupplierNameTaken(
  name: string,
  exceptId?: number
): Promise<boolean> {
  const row = await queryOne<{ id: number }>(
    `SELECT id FROM albelt_supplier
      WHERE name = $1 AND ($2::int IS NULL OR id <> $2)
      LIMIT 1`,
    [name, exceptId ?? null]
  );
  return row != null;
}

export interface ListSuppliersOptions {
  search?: string;
  active?: boolean | null;
  sort?: "name" | "date_creation";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listSuppliers(
  opts: ListSuppliersOptions = {}
): Promise<{ items: Supplier[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const sort = opts.sort === "name" ? "s.name" : "s.date_creation";
  const order = opts.order === "asc" ? "ASC" : "DESC";
  const search = (opts.search ?? "").trim();
  const active = opts.active ?? null;

  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`s.name ILIKE $${params.length}`);
  }
  if (active !== null) {
    params.push(active);
    where.push(`s.is_active = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM albelt_supplier s ${whereSql}`,
    params
  );
  const total = totalRow ? Number(totalRow.count) : 0;

  const offset = (page - 1) * pageSize;
  const limitParams = [...params, pageSize, offset];
  const rows = await query<SupplierRow>(
    `SELECT s.id, s.name, s.country_code, c.name_fr AS country_name,
            s.is_active, s.date_creation
       FROM albelt_supplier s
       LEFT JOIN albelt_country c ON s.country_code = c.code
       ${whereSql}
       ORDER BY ${sort} ${order}
       LIMIT $${limitParams.length - 1} OFFSET $${limitParams.length}`,
    limitParams
  );

  return { items: rows.map(mapSupplier), total };
}

export async function createSupplier(
  input: NewSupplierInput
): Promise<Supplier> {
  const row = await queryOne<SupplierRow>(
    `INSERT INTO albelt_supplier (name, country_code, is_active)
     VALUES ($1, $2, $3)
     RETURNING id, name, country_code, is_active, date_creation`,
    [input.name, input.country_code, input.is_active ?? true]
  );
  if (!row) throw new Error("Failed to create supplier");
  // Fetch with country name
  return findSupplierById(row.id) as Promise<Supplier>;
}

export async function updateSupplier(
  id: number,
  input: UpdateSupplierInput
): Promise<Supplier | null> {
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${idx++}`);
    params.push(input.name);
  }
  if (input.country_code !== undefined) {
    fields.push(`country_code = $${idx++}`);
    params.push(input.country_code);
  }
  if (input.is_active !== undefined) {
    fields.push(`is_active = $${idx++}`);
    params.push(input.is_active);
  }

  if (fields.length === 0) return findSupplierById(id);

  params.push(id);
  await query(
    `UPDATE albelt_supplier
        SET ${fields.join(", ")}
      WHERE id = $${idx}`,
    params
  );
  return findSupplierById(id);
}

export async function deleteSupplier(id: number): Promise<boolean> {
  const row = await queryOne<{ id: number }>(
    `DELETE FROM albelt_supplier WHERE id = $1 RETURNING id`,
    [id]
  );
  return row != null;
}

/** List active suppliers only – used by public API for form dropdowns. */
export async function listActiveSuppliers(): Promise<Supplier[]> {
  const rows = await query<SupplierRow>(
    `SELECT s.id, s.name, s.country_code, c.name_fr AS country_name,
            s.is_active, s.date_creation
       FROM albelt_supplier s
       LEFT JOIN albelt_country c ON s.country_code = c.code
      WHERE s.is_active = true
      ORDER BY s.name ASC`
  );
  return rows.map(mapSupplier);
}
