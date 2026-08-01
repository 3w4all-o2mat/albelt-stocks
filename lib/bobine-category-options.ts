// Predefined option lists for albelt_stocks_categories fields.
// Each option has a `label` (the human-readable value stored in the DB)
// and a `code` (used to compute the compact `name` column).
//
// Computed name format: <nature>/<color>/<plies>/<thickness>/<motif>
// Example: PVC/V/2p/2/ND

export interface CategoryOption {
  label: string;
  code: string;
}

export const NATURE_OPTIONS: CategoryOption[] = [
  { label: "Pvc", code: "PVC" },
  { label: "Polyuréthane", code: "PU" },
  { label: "Caoutchouc", code: "CAO" },
  { label: "Courroies", code: "COR" },
  { label: "Bavettes", code: "BAV" },
];

export const COLOR_OPTIONS: CategoryOption[] = [
  { label: "Vert Pistache", code: "VPIS" },
  { label: "Vert Pétrole", code: "VPET" },
  { label: "Bleu", code: "BLEU" },
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
  { label: "0.7mm", code: "0.7" },
  { label: "0.8mm", code: "0.8" },
  { label: "0.9mm", code: "0.9" },
  { label: "1.0mm", code: "1.0" },
  { label: "1.1mm", code: "1.1" },
  { label: "1.2mm", code: "1.2" },
  { label: "1.3mm", code: "1.3" },
  { label: "1.4mm", code: "1.4" },
  { label: "1.5mm", code: "1.5" },
  { label: "2.0mm", code: "2.0" },
  { label: "2.2mm", code: "2.2" },
  { label: "2.5mm", code: "2.5" },
  { label: "2.6mm", code: "2.6" },
  { label: "2.8mm", code: "2.8" },
  { label: "3.0mm", code: "3.0" },
  { label: "3.5mm", code: "3.5" },
  { label: "3.8mm", code: "3.8" },
  { label: "4.0mm", code: "4.0" },
  { label: "4.2mm", code: "4.2" },
  { label: "4.6mm", code: "4.6" },
  { label: "5.0mm", code: "5.0" },
  { label: "5.3mm", code: "5.3" },
  { label: "5.5mm", code: "5.5" },
  { label: "6.0mm", code: "6.0" },
  { label: "7.0mm", code: "7.0" },
  { label: "8.0mm", code: "8.0" },
  { label: "8.5mm", code: "8.5" },
  { label: "9.0mm", code: "9.0" },
  { label: "9.5mm", code: "9.5" },
  { label: "10mm", code: "10" },
  { label: "11mm", code: "11" },
  { label: "12mm", code: "12" },
  { label: "13mm", code: "13" },
  { label: "14mm", code: "14" },
  { label: "15mm", code: "15" },
  { label: "16mm", code: "16" },
  { label: "20mm", code: "20" },
];

export const MOTIF_OPTIONS: CategoryOption[] = [
  { label: "Nid d'abeille", code: "SG" },
  { label: "Mate", code: "MAT" },
];

function codeFor(
  options: CategoryOption[],
  label: string
): string | undefined {
  return options.find((o) => o.label === label)?.code;
}

/**
 * Compute the compact category name from its field labels.
 * Returns null if any field is unknown/empty.
 */
export function computeCategoryName(input: {
  nature: string;
  color: string;
  plies: string;
  thickness: string;
  motif: string;
}): string | null {
  const nature = codeFor(NATURE_OPTIONS, input.nature);
  const color = codeFor(COLOR_OPTIONS, input.color);
  const plies = codeFor(PLIES_OPTIONS, input.plies);
  const thickness = codeFor(THICKNESS_OPTIONS, input.thickness);
  const motif = codeFor(MOTIF_OPTIONS, input.motif);
  if (!nature || !color || !plies || !thickness || !motif) return null;
  return `${nature}/${color}/${plies}/${thickness}/${motif}`;
}

export function isKnownCategoryField(input: {
  nature: string;
  color: string;
  plies: string;
  thickness: string;
  motif: string;
}): boolean {
  return computeCategoryName(input) != null;
}