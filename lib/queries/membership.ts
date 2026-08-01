import { query, queryOne } from "@/lib/db";
import odooPool from "@/lib/odoo-db";
import type {
  MembershipRole,
  MembershipUser,
  NewUserInput,
  UpdateProfileInput,
  UpdateUserInput,
} from "@/lib/types";
import { hashPassword } from "@/lib/auth/password";

interface MembershipRow {
  [k: string]: unknown;
  id: number;
  username: string;
  password_hash: string;
  email: string;
  odoo_username: string | null;
  role: MembershipRole;
  full_name: string | null;
  atelier_id: number | null;
  date_creation: string;
  is_active: boolean;
}

function toPublic(row: MembershipRow, atelierIds: number[] = []): MembershipUser {
  const { password_hash: _omit, ...rest } = row;
  void _omit;
  // Ensure atelier_id is valid: null if not in assigned ateliers.
  const atelierId = rest.atelier_id ?? null;
  const validAtelierId =
    atelierId != null && atelierIds.includes(atelierId) ? atelierId : null;
  return { ...rest, atelier_id: validAtelierId, atelier_ids: atelierIds };
}

/**
 * Load the atelier IDs assigned to a user.
 */
export async function getUserAtelierIds(userId: number): Promise<number[]> {
  const rows = await query<{ atelier_id: number }>(
    `SELECT atelier_id FROM albelt_membership_atelier WHERE membership_id = $1`,
    [userId]
  );
  return rows.map((r) => r.atelier_id);
}

/**
 * Replace a user's atelier assignments.
 */
export async function setUserAtelierIds(
  userId: number,
  atelierIds: number[]
): Promise<void> {
  const ids = [...new Set(atelierIds)].filter(
    (id) => Number.isInteger(id) && id > 0
  );
  await query(
    `DELETE FROM albelt_membership_atelier WHERE membership_id = $1`,
    [userId]
  );
  if (ids.length === 0) return;
  const values = ids.map((_, i) => `($1, $${i + 2})`).join(", ");
  await query(
    `INSERT INTO albelt_membership_atelier (membership_id, atelier_id) VALUES ${values}`,
    [userId, ...ids]
  );
}

/**
 * Look up a user by username (includes password_hash for login verification).
 */
export async function findUserByUsernameForLogin(
  username: string
): Promise<MembershipRow | null> {
  return queryOne<MembershipRow>(
    `SELECT id, username, password_hash, email, odoo_username, role,
            full_name, atelier_id, date_creation, is_active
       FROM albelt_membership
      WHERE username = $1
      LIMIT 1`,
    [username]
  );
}

export async function findUserById(id: number): Promise<MembershipUser | null> {
  const row = await queryOne<MembershipRow>(
    `SELECT id, username, password_hash, email, odoo_username, role,
            full_name, atelier_id, date_creation, is_active
       FROM albelt_membership
      WHERE id = $1
      LIMIT 1`,
    [id]
  );
  if (!row) return null;
  const atelierIds = await getUserAtelierIds(id);
  return toPublic(row, atelierIds);
}

export async function isEmailTaken(
  email: string,
  exceptId?: number
): Promise<boolean> {
  const row = await queryOne<{ id: number }>(
    `SELECT id FROM albelt_membership WHERE email = $1 AND ($2::int IS NULL OR id <> $2) LIMIT 1`,
    [email, exceptId ?? null]
  );
  return row != null;
}

export async function isUsernameTaken(username: string): Promise<boolean> {
  const row = await queryOne<{ id: number }>(
    `SELECT id FROM albelt_membership WHERE username = $1 LIMIT 1`,
    [username]
  );
  return row != null;
}

export interface ListUsersOptions {
  search?: string;
  role?: MembershipRole | null;
  sort?: "date_creation" | "username";
  order?: "asc" | "desc";
  page?: number;
  pageSize?: number;
}

export async function listUsers(
  opts: ListUsersOptions = {}
): Promise<{ items: MembershipUser[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const sort = opts.sort === "username" ? "username" : "date_creation";
  const order = opts.order === "asc" ? "ASC" : "DESC";
  const search = (opts.search ?? "").trim();
  const role = opts.role ?? null;

  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`(username ILIKE $${params.length} OR email ILIKE $${params.length})`);
  }
  if (role) {
    params.push(role);
    where.push(`role = $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM albelt_membership ${whereSql}`,
    params
  );
  const total = totalRow ? Number(totalRow.count) : 0;

  const offset = (page - 1) * pageSize;
  const limitParams = [...params, pageSize, offset];
  const rows = await query<MembershipRow>(
    `SELECT id, username, password_hash, email, odoo_username, role,
            full_name, atelier_id, date_creation, is_active
       FROM albelt_membership
       ${whereSql}
       ORDER BY ${sort} ${order}
       LIMIT $${limitParams.length - 1} OFFSET $${limitParams.length}`,
    limitParams
  );

  const userIds = rows.map((r) => r.id);
  const assignments = await query<{ membership_id: number; atelier_id: number }>(
    `SELECT membership_id, atelier_id
       FROM albelt_membership_atelier
      WHERE membership_id = ANY($1)`,
    [userIds]
  );
  const idsByUser = new Map<number, number[]>();
  for (const a of assignments) {
    const list = idsByUser.get(a.membership_id);
    if (list) list.push(a.atelier_id);
    else idsByUser.set(a.membership_id, [a.atelier_id]);
  }

  return { items: rows.map((r) => toPublic(r, idsByUser.get(r.id) ?? [])), total };
}

export async function createUser(input: NewUserInput): Promise<MembershipUser> {
  const passwordHash = await hashPassword(input.password);
  const effectiveAtelierIds = [...new Set(input.atelier_ids ?? [])].filter(
    (id) => Number.isInteger(id) && id > 0
  );
  const effectiveAtelierId =
    input.atelier_id != null && effectiveAtelierIds.includes(input.atelier_id)
      ? input.atelier_id
      : null;

  const row = await queryOne<MembershipRow>(
    `INSERT INTO albelt_membership
        (username, password_hash, email, odoo_username, role, full_name, atelier_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, username, password_hash, email, odoo_username, role,
               full_name, atelier_id, date_creation, is_active`,
    [
      input.username,
      passwordHash,
      input.email,
      input.odoo_username ?? null,
      input.role,
      input.full_name ?? null,
      effectiveAtelierId,
    ]
  );
  if (!row) throw new Error("Failed to create user");
  if (effectiveAtelierIds.length > 0) {
    await setUserAtelierIds(row.id, effectiveAtelierIds);
  }
  return toPublic(row, effectiveAtelierIds);
}

export async function updateUser(
  id: number,
  input: UpdateUserInput
): Promise<MembershipUser | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  const push = (col: string, value: unknown) => {
    params.push(value);
    sets.push(`${col} = $${params.length}`);
  };

  if (input.full_name !== undefined) push("full_name", input.full_name ?? null);
  if (input.email !== undefined) push("email", input.email);
  if (input.odoo_username !== undefined)
    push("odoo_username", input.odoo_username ?? null);
  if (input.role !== undefined) push("role", input.role);
  if (input.is_active !== undefined) push("is_active", input.is_active);
  if (input.password) {
    push("password_hash", await hashPassword(input.password));
  }

  if (input.atelier_id !== undefined) {
    const effectiveAtelierIds =
      input.atelier_ids !== undefined
        ? [...new Set(input.atelier_ids)].filter(
            (id) => Number.isInteger(id) && id > 0
          )
        : await getUserAtelierIds(id);
    const effectiveAtelierId =
      input.atelier_id != null && effectiveAtelierIds.includes(input.atelier_id)
        ? input.atelier_id
        : null;
    push("atelier_id", effectiveAtelierId);
  } else if (input.atelier_ids !== undefined) {
    // If only atelier_ids changed, ensure the current default still belongs to the new set.
    const current = await queryOne<{ atelier_id: number | null }>(
      `SELECT atelier_id FROM albelt_membership WHERE id = $1`,
      [id]
    );
    const currentAtelierId = current?.atelier_id ?? null;
    const newIds = [...new Set(input.atelier_ids)].filter(
      (id) => Number.isInteger(id) && id > 0
    );
    if (currentAtelierId != null && !newIds.includes(currentAtelierId)) {
      push("atelier_id", null);
    }
  }

  if (sets.length === 0 && input.atelier_ids === undefined) {
    return findUserById(id);
  }

  params.push(id);
  const row = await queryOne<MembershipRow>(
    `UPDATE albelt_membership
        SET ${sets.join(", ")}
      WHERE id = $${params.length}
     RETURNING id, username, password_hash, email, odoo_username, role,
               full_name, atelier_id, date_creation, is_active`,
    params
  );
  if (!row) return null;

  if (input.atelier_ids !== undefined) {
    await setUserAtelierIds(id, input.atelier_ids);
  }
  const atelierIds = await getUserAtelierIds(id);
  return toPublic(row, atelierIds);
}

export async function updateProfile(
  id: number,
  input: UpdateProfileInput
): Promise<MembershipUser | null> {
  const sets: string[] = [];
  const params: unknown[] = [];
  if (input.full_name !== undefined) {
    params.push(input.full_name ?? null);
    sets.push(`full_name = $${params.length}`);
  }
  if (input.email !== undefined) {
    params.push(input.email);
    sets.push(`email = $${params.length}`);
  }
  if (sets.length === 0) return findUserById(id);

  params.push(id);
  const row = await queryOne<MembershipRow>(
    `UPDATE albelt_membership
        SET ${sets.join(", ")}
      WHERE id = $${params.length}
     RETURNING id, username, password_hash, email, odoo_username, role,
               full_name, atelier_id, date_creation, is_active`,
    params
  );
  return row ? toPublic(row) : null;
}

export async function updatePassword(
  id: number,
  newPlainPassword: string
): Promise<void> {
  const hash = await hashPassword(newPlainPassword);
  await query(
    `UPDATE albelt_membership SET password_hash = $1 WHERE id = $2`,
    [hash, id]
  );
}

export async function getUserPasswordHash(
  id: number
): Promise<string | null> {
  const row = await queryOne<{ password_hash: string }>(
    `SELECT password_hash FROM albelt_membership WHERE id = $1`,
    [id]
  );
  return row?.password_hash ?? null;
}

export async function deleteUser(id: number): Promise<boolean> {
  const row = await queryOne<{ id: number }>(
    `DELETE FROM albelt_membership WHERE id = $1 RETURNING id`,
    [id]
  );
  return row != null;
}

/**
 * Resolve the Odoo res_users.id for an app membership user, by
 * matching albelt_membership.odoo_username to res_users.login.
 *
 * Returns null when:
 * - the membership has no odoo_username, or
 * - no res_users row matches that login.
 */
export async function findOdooUserIdByMembershipId(
  membershipId: number
): Promise<number | null> {
  const localRow = await queryOne<{ odoo_username: string | null }>(
    `SELECT odoo_username FROM albelt_membership WHERE id = $1 LIMIT 1`,
    [membershipId]
  );
  const odooUsername = localRow?.odoo_username?.trim() ?? "";
  if (!odooUsername) return null;

  const odooRow = await odooPool.query<{ id: number }>(
    `SELECT id FROM res_users WHERE login = $1 LIMIT 1`,
    [odooUsername]
  );
  return odooRow.rows[0]?.id ?? null;
}
