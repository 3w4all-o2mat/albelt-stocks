import { query, queryOne } from "@/lib/db";
import type { Country, NewCountryInput, UpdateCountryInput } from "@/lib/types";

interface CountryRow {
  [k: string]: unknown;
  code: string;
  name_fr: string;
  name_en: string;
}

function mapCountry(row: CountryRow): Country {
  return {
    code: row.code,
    name_fr: row.name_fr,
    name_en: row.name_en,
  };
}

export async function listCountries(): Promise<Country[]> {
  const rows = await query<CountryRow>(
    `SELECT code, name_fr, name_en
       FROM albelt_country
      ORDER BY name_fr ASC`
  );
  return rows.map(mapCountry);
}

export async function findCountryByCode(code: string): Promise<Country | null> {
  const row = await queryOne<CountryRow>(
    `SELECT code, name_fr, name_en
       FROM albelt_country
      WHERE code = $1
      LIMIT 1`,
    [code]
  );
  return row ? mapCountry(row) : null;
}

export async function isCountryCodeTaken(
  code: string,
  exceptCode?: string
): Promise<boolean> {
  const row = await queryOne<{ code: string }>(
    `SELECT code FROM albelt_country
      WHERE code = $1 AND ($2::varchar IS NULL OR code <> $2)
      LIMIT 1`,
    [code, exceptCode ?? null]
  );
  return row != null;
}

export async function createCountry(input: NewCountryInput): Promise<Country> {
  const row = await queryOne<CountryRow>(
    `INSERT INTO albelt_country (code, name_fr, name_en)
     VALUES ($1, $2, $3)
     RETURNING code, name_fr, name_en`,
    [input.code.toUpperCase(), input.name_fr, input.name_en]
  );
  if (!row) throw new Error("Failed to create country");
  return mapCountry(row);
}

export async function updateCountry(
  code: string,
  input: UpdateCountryInput
): Promise<Country | null> {
  const fields: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (input.name_fr !== undefined) {
    fields.push(`name_fr = $${idx++}`);
    params.push(input.name_fr);
  }
  if (input.name_en !== undefined) {
    fields.push(`name_en = $${idx++}`);
    params.push(input.name_en);
  }

  if (fields.length === 0) return findCountryByCode(code);

  params.push(code);
  const row = await queryOne<CountryRow>(
    `UPDATE albelt_country
        SET ${fields.join(", ")}
      WHERE code = $${idx}
      RETURNING code, name_fr, name_en`,
    params
  );
  return row ? mapCountry(row) : null;
}

export async function deleteCountry(code: string): Promise<boolean> {
  const row = await queryOne<{ code: string }>(
    `DELETE FROM albelt_country WHERE code = $1 RETURNING code`,
    [code]
  );
  return row != null;
}
