// Predefined option lists for albelt_stocks_categories fields.
// Each option has a `label` (the human-readable value stored in the DB)
// and a `code` (used to compute the compact `name` column).
//
// Computed name format: <nature>/<color>/<plies>/<thickness>/<motif>[.<pays>]
// Example (no pays): PVC/BLEU/1P/0.7/SG
// Example (with pays): PVC/BLEU/1P/0.7/SG.IT

export interface CategoryOption {
  label: string;
  code: string;
}

export const NATURE_OPTIONS: CategoryOption[] = [
  { label: "Pvc", code: "PVC" },
  { label: "Polyuréthane", code: "PU" },
  { label: "Polyuréthane Forbo", code: "PUF" },
  { label: "Caoutchouc", code: "CAO" },
  { label: "Courroies", code: "COR" },
  { label: "Bavettes", code: "BAV" },

];

export const COLOR_OPTIONS: CategoryOption[] = [
  { label: "Vert Pistache", code: "VPIS" },
  { label: "Vert Pétrole", code: "VPET" },
  { label: "Bleu", code: "B" },
  { label: "Blanc", code: "BLANC" },
  { label: "Noire", code: "NR" },

];

export const PLIES_OPTIONS: CategoryOption[] = [
  { label: "1 Plie", code: "1P" },
  { label: "2 Plies", code: "2P" },
  { label: "3 Plies", code: "3P" },
  { label: "4 Plies", code: "4P" },
  { label: "5 Plies", code: "5P" },

];

export const THICKNESS_OPTIONS: CategoryOption[] = [
  { label: "0.7 mm", code: "0.7" },
  { label: "0.8 mm", code: "0.8" },
  { label: "0.9 mm", code: "0.9" },
  { label: "1.0 mm", code: "1.0" },
  { label: "1.1 mm", code: "1.1" },
  { label: "1.15 mm", code: "1.15" },
  { label: "1.2 mm", code: "1.2" },
  { label: "1.3 mm", code: "1.3" },
  { label: "1.4 mm", code: "1.4" },
  { label: "1.5 mm", code: "1.5" },
  { label: "2.0 mm", code: "2.0" },
  { label: "2.2 mm", code: "2.2" },
  { label: "2.5 mm", code: "2.5" },
  { label: "2.6 mm", code: "2.6" },
  { label: "2.8 mm", code: "2.8" },
  { label: "3.0 mm", code: "3.0" },
  { label: "3.5 mm", code: "3.5" },
  { label: "3.8 mm", code: "3.8" },
  { label: "4.0 mm", code: "4.0" },
  { label: "4.2 mm", code: "4.2" },
  { label: "4.6 mm", code: "4.6" },
  { label: "5.0 mm", code: "5.0" },
  { label: "5.3 mm", code: "5.3" },
  { label: "5.5 mm", code: "5.5" },
  { label: "6.0 mm", code: "6.0" },
  { label: "7.0 mm", code: "7.0" },
  { label: "8.0 mm", code: "8.0" },
  { label: "8.5 mm", code: "8.5" },
  { label: "9.0 mm", code: "9.0" },
  { label: "9.5 mm", code: "9.5" },
  { label: "10 mm", code: "10" },
  { label: "11 mm", code: "11" },
  { label: "12 mm", code: "12" },
  { label: "13 mm", code: "13" },
  { label: "14 mm", code: "14" },
  { label: "15 mm", code: "15" },
  { label: "16 mm", code: "16" },
  { label: "20 mm", code: "20" },

];

export const MOTIF_OPTIONS: CategoryOption[] = [
  { label: "Nid d'abeille", code: "SG" },
  { label: "ND", code: "ND" },
  { label: "LIS", code: "LIS" },
  { label: "Sablé", code: "SAB" },
  { label: "Mate", code: "MAT" },
  { label: "Diamond", code: "DIA" },
  { label: "GOLF", code: "GO" },
  { label: "SD", code: "SD" },
  { label: "LG", code: "LG" },
  { label: "VD", code: "VD" },
  { label: "NOVO", code: "NOVO" },
  { label: "GD", code: "GD" },
  { label: "SB", code: "SB" },
  { label: "Hanvr Bandi", code: "HB" },
  { label: "SBAG", code: "SBAG" },

];

export const PAYS_OPTIONS: CategoryOption[] = [
  { label: "Espagne", code: "ES" },
  { label: "Italy", code: "IT" },
  { label: "France", code: "FR" },
  { label: "Allmagne", code: "GR" },
  { label: "Turque", code: "TR" },
  { label: "Chine", code: "CN" },
];

function codeFor(
  options: CategoryOption[],
  label: string
): string | undefined {
  return options.find((o) => o.label === label)?.code;
}

/**
 * Compute the compact category name from its field labels.
 * Returns null if any required field is unknown/empty.
 * The optional `pays` field is appended after the motif, separated by a dot.
 */
export function computeCategoryName(input: {
  nature: string;
  color: string;
  plies: string;
  thickness: string;
  motif: string;
  pays?: string | null;
}): string | null {
  const nature = codeFor(NATURE_OPTIONS, input.nature);
  const color = codeFor(COLOR_OPTIONS, input.color);
  const plies = codeFor(PLIES_OPTIONS, input.plies);
  const thickness = codeFor(THICKNESS_OPTIONS, input.thickness);
  const motif = codeFor(MOTIF_OPTIONS, input.motif);
  if (!nature || !color || !plies || !thickness || !motif) return null;
  const paysCode =
    input.pays != null && String(input.pays).trim() !== ""
      ? codeFor(PAYS_OPTIONS, String(input.pays).trim())
      : undefined;
  return paysCode
    ? `${nature}/${color}/${plies}/${thickness}/${motif}.${paysCode}`
    : `${nature}/${color}/${plies}/${thickness}/${motif}`;
}

export function isKnownCategoryField(input: {
  nature: string;
  color: string;
  plies: string;
  thickness: string;
  motif: string;
  pays?: string | null;
}): boolean {
  return computeCategoryName(input) != null;
}