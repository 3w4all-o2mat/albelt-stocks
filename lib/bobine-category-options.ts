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
  { label: "Polystere", code: "POL" },
  { label: "Caoutchouc", code: "CAO" },
];

export const COLOR_OPTIONS: CategoryOption[] = [
  { label: "Vert", code: "V" },
  { label: "Rouge", code: "R" },
  { label: "Bleu", code: "B" },
  { label: "White", code: "W" },
  { label: "Jaune", code: "J" },
];

export const PLIES_OPTIONS: CategoryOption[] = [
  { label: "2P", code: "2P" },
  { label: "3P", code: "3P" },
  { label: "4P", code: "4P" },
];

export const THICKNESS_OPTIONS: CategoryOption[] = [
  { label: "1mm", code: "1" },
  { label: "2mm", code: "2" },
  { label: "3mm", code: "3" },
  { label: "4mm", code: "4" },
];

export const MOTIF_OPTIONS: CategoryOption[] = [
  { label: "Nid d'abeille", code: "ND" },
  { label: "Maté", code: "M" },
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