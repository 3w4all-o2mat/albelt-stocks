import { query, queryOne } from "@/lib/db";
import type { CreateJournalInput, JournalEntry } from "@/lib/types";

interface JournalRow {
  [k: string]: unknown;
  id: number;
  operation: string;
  user_id: number | null;
  user_name: string;
  date: string;
}

export interface ListJournalOptions {
  search?: string;
  page?: number;
  pageSize?: number;
}

export async function listJournal(
  opts: ListJournalOptions = {}
): Promise<{ items: JournalEntry[]; total: number }> {
  const page = Math.max(1, opts.page ?? 1);
  const pageSize = Math.min(200, Math.max(1, opts.pageSize ?? 50));
  const search = (opts.search ?? "").trim();

  const where: string[] = [];
  const params: unknown[] = [];
  if (search) {
    params.push(`%${search}%`);
    where.push(`operation ILIKE $${params.length}`);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const totalRow = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM albelt_journal ${whereSql}`,
    params
  );
  const total = totalRow ? Number(totalRow.count) : 0;

  const offset = (page - 1) * pageSize;
  const limitParams = [...params, pageSize, offset];
  const rows = await query<JournalRow>(
    `SELECT id, operation, user_id, user_name, date
       FROM albelt_journal
       ${whereSql}
       ORDER BY date DESC
       LIMIT $${limitParams.length - 1} OFFSET $${limitParams.length}`,
    limitParams
  );

  return { items: rows as JournalEntry[], total };
}

export async function createJournalEntry(
  input: CreateJournalInput
): Promise<JournalEntry> {
  const row = await queryOne<JournalRow>(
    `INSERT INTO albelt_journal (operation, user_id, user_name)
     VALUES ($1, $2, $3)
     RETURNING id, operation, user_id, user_name, date`,
    [input.operation, input.user_id, input.user_name]
  );
  if (!row) throw new Error("Failed to create journal entry");
  return row as JournalEntry;
}

/**
 * Helper to build standard operation descriptions for stock pieces.
 */
import type { PieceType } from "@/lib/types";

export function formatJournalOperation(
  type: PieceType,
  pieceName: string,
  longueur: number,
  largeur: number
): string {
  const dims = `${longueur}x${largeur}`;
  switch (type) {
    case "BO":
      return `ajout nouvelle bobine sous le nom ${pieceName} (${dims})`;
    case "CC":
      return `coupe: commande sous le nom ${pieceName} (${dims})`;
    case "CS":
      return `chute stocké sous le nom ${pieceName} (${dims})`;
    case "CP":
      return `chute perdue sous le nom ${pieceName} (${dims})`;
    case "SI":
      return `stock initial SI activé: ${pieceName} (${dims})`;
  }
}