import { query, queryOne } from "@/lib/db";
import type {
  AppVariable,
  NewVariableInput,
  UpdateVariableInput,
  VariableType,
} from "@/lib/types";

interface VariableRow {
  [k: string]: unknown;
  id: number;
  key: string;
  label: string;
  type: VariableType;
  value: string;
  date_creation: string;
  write_date: string;
}

function toVariable(row: VariableRow): AppVariable {
  return {
    id: Number(row.id),
    key: String(row.key),
    label: String(row.label),
    type: row.type as VariableType,
    value: String(row.value),
    date_creation: String(row.date_creation),
    write_date: String(row.write_date),
  };
}

export async function findVariableById(
  id: number
): Promise<AppVariable | null> {
  const row = await queryOne<VariableRow>(
    `SELECT id, key, label, type, value, date_creation, write_date
       FROM albelt_variables
      WHERE id = $1
      LIMIT 1`,
    [id]
  );
  return row ? toVariable(row) : null;
}

export async function findVariableByKey(
  key: string
): Promise<AppVariable | null> {
  const row = await queryOne<VariableRow>(
    `SELECT id, key, label, type, value, date_creation, write_date
       FROM albelt_variables
      WHERE key = $1
      LIMIT 1`,
    [key]
  );
  return row ? toVariable(row) : null;
}

export async function isVariableKeyTaken(
  key: string,
  exceptId?: number
): Promise<boolean> {
  const row = await queryOne<{ id: number }>(
    `SELECT id FROM albelt_variables
      WHERE key = $1 AND ($2::int IS NULL OR id <> $2)
      LIMIT 1`,
    [key, exceptId ?? null]
  );
  return row != null;
}

export interface ListVariablesOptions {
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listVariables(
  opts: ListVariablesOptions = {}
): Promise<{ items: AppVariable[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const search = (opts.search ?? "").trim();

  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(
      `(key ILIKE $${params.length} OR label ILIKE $${params.length})`
    );
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM albelt_variables ${whereSql}`,
    params
  );
  const total = totalRow ? Number(totalRow.count) : 0;

  const offset = (page - 1) * pageSize;
  const limitParams = [...params, pageSize, offset];
  const rows = await query<VariableRow>(
    `SELECT id, key, label, type, value, date_creation, write_date
       FROM albelt_variables
       ${whereSql}
       ORDER BY key ASC
       LIMIT $${limitParams.length - 1} OFFSET $${limitParams.length}`,
    limitParams
  );

  return { items: rows.map(toVariable), total };
}

function isValidForType(type: VariableType, value: string): boolean {
  switch (type) {
    case "integer":
      return /^-?\d+$/.test(value.trim());
    case "boolean":
      return ["true", "false"].includes(value.trim().toLowerCase());
    case "string":
    default:
      return true;
  }
}

export async function createVariable(
  input: NewVariableInput
): Promise<AppVariable> {
  if (!isValidForType(input.type, input.value)) {
    throw new Error(`Invalid value for type ${input.type}`);
  }
  const row = await queryOne<VariableRow>(
    `INSERT INTO albelt_variables (key, label, type, value, date_creation, write_date)
     VALUES ($1, $2, $3, $4, NOW(), NOW())
     RETURNING id, key, label, type, value, date_creation, write_date`,
    [
      input.key.trim().toUpperCase(),
      input.label.trim(),
      input.type,
      input.value.trim(),
    ]
  );
  if (!row) throw new Error("Failed to create variable");
  return toVariable(row);
}

export async function updateVariable(
  id: number,
  input: UpdateVariableInput
): Promise<AppVariable | null> {
  const existing = await findVariableById(id);
  if (!existing) return null;

  const type = input.type ?? existing.type;
  const value = input.value ?? existing.value;

  if (!isValidForType(type, value)) {
    throw new Error(`Invalid value for type ${type}`);
  }

  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (col: string, val: unknown) => {
    params.push(val);
    sets.push(`${col} = $${params.length}`);
  };

  if (input.label !== undefined) push("label", input.label.trim());
  if (input.type !== undefined) push("type", input.type);
  if (input.value !== undefined) push("value", input.value.trim());

  if (sets.length === 0) return existing;

  params.push(id);
  const row = await queryOne<VariableRow>(
    `UPDATE albelt_variables
        SET ${sets.join(", ")}, write_date = NOW()
      WHERE id = $${params.length}
     RETURNING id, key, label, type, value, date_creation, write_date`,
    params
  );
  return row ? toVariable(row) : null;
}

export async function deleteVariable(id: number): Promise<boolean> {
  const row = await queryOne<{ id: number }>(
    `DELETE FROM albelt_variables WHERE id = $1 RETURNING id`,
    [id]
  );
  return row != null;
}

/**
 * Convenience: read an integer variable by key.
 * Returns null if missing or not an integer variable.
 */
export async function getIntegerVariable(
  key: string
): Promise<number | null> {
  const row = await findVariableByKey(key);
  if (!row || row.type !== "integer") return null;
  const n = Number(row.value.trim());
  return Number.isInteger(n) ? n : null;
}