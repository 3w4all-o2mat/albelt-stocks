import { PieceType, TYPE_COLORS, TYPE_LABELS, StockPiece } from "./types";

/**
 * Compute a uniform scale factor (px per mm) so that a rectangle of
 * `longueur` x `largeur` mm fits inside `maxWidth` x `maxHeight` px.
 */
export function computeScale(
  longueur: number,
  largeur: number,
  maxWidth: number,
  maxHeight: number
): number {
  if (longueur <= 0 || largeur <= 0) return 1;
  return Math.min(maxWidth / longueur, maxHeight / largeur);
}

function rectsIntersect(
  a: { cute_x: number; cute_y: number; longueur: number; largeur: number },
  b: { cute_x: number; cute_y: number; longueur: number; largeur: number }
): boolean {
  return (
    a.cute_x < b.cute_x + b.longueur &&
    a.cute_x + a.longueur > b.cute_x &&
    a.cute_y < b.cute_y + b.largeur &&
    a.cute_y + a.largeur > b.cute_y
  );
}

export function formatMm(value: number): string {
  return `${value.toLocaleString("fr-FR")} mm`;
}

export function formatDimensions(l: number, w: number): string {
  return `${formatMm(l)} × ${formatMm(w)}`;
}

export function formatSurface(surface: number | null | undefined): string {
  if (surface == null) return "—";
  return `${surface.toLocaleString("fr-FR", { maximumFractionDigits: 3 })} m²`;
}

export function typeColor(type: PieceType): string {
  return TYPE_COLORS[type];
}

export function typeLabel(type: PieceType): string {
  return TYPE_LABELS[type];
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

/**
 * Validate that a cut fits within its source boundaries and does not
 * overlap any existing cut.
 */
export function validateCut(
  cute_x: number,
  cute_y: number,
  longueur: number,
  largeur: number,
  sourceLongueur: number,
  sourceLargeur: number,
  existingCuts?: StockPiece[]
): { ok: boolean; error?: string } {
  if (longueur <= 0 || largeur <= 0) {
    return { ok: false, error: "Les dimensions doivent être positives." };
  }
  if (cute_x < 0 || cute_y < 0) {
    return { ok: false, error: "Les positions doivent être positives." };
  }
  if (cute_x + longueur > sourceLongueur) {
    return {
      ok: false,
      error: `La coupe dépasse la longueur de la source (${cute_x + longueur} > ${sourceLongueur} mm).`,
    };
  }
  if (cute_y + largeur > sourceLargeur) {
    return {
      ok: false,
      error: `La coupe dépasse la largeur de la source (${cute_y + largeur} > ${sourceLargeur} mm).`,
    };
  }

  const newCut = { cute_x, cute_y, longueur, largeur };
  for (const cut of existingCuts ?? []) {
    if (rectsIntersect(newCut, cut)) {
      return {
        ok: false,
        error: `La nouvelle coupe chevauche une coupe existante (#${cut.id}).`,
      };
    }
  }

  return { ok: true };
}

/**
 * Check whether a rectangle of the given dimensions can be placed somewhere
 * inside a source piece without overlapping its existing cuts.
 *
 * Returns the first valid placement found, or null if no placement exists.
 */
export function canFitDimensions(
  longueur: number,
  largeur: number,
  sourceLongueur: number,
  sourceLargeur: number,
  existingCuts?: StockPiece[]
): { ok: true; cute_x: number; cute_y: number } | { ok: false } {
  if (longueur <= 0 || largeur <= 0) {
    return { ok: false };
  }
  if (longueur > sourceLongueur || largeur > sourceLargeur) {
    return { ok: false };
  }

  const cuts = existingCuts ?? [];
  const xs = new Set([0]);
  const ys = new Set([0]);
  for (const cut of cuts) {
    const right = cut.cute_x + cut.longueur;
    const bottom = cut.cute_y + cut.largeur;
    if (right <= sourceLongueur) xs.add(right);
    if (bottom <= sourceLargeur) ys.add(bottom);
  }

  const sortedXs = Array.from(xs).sort((a, b) => a - b);
  const sortedYs = Array.from(ys).sort((a, b) => a - b);

  for (const cute_x of sortedXs) {
    if (cute_x + longueur > sourceLongueur) continue;
    for (const cute_y of sortedYs) {
      if (cute_y + largeur > sourceLargeur) continue;
      const check = validateCut(
        cute_x,
        cute_y,
        longueur,
        largeur,
        sourceLongueur,
        sourceLargeur,
        cuts
      );
      if (check.ok) {
        return { ok: true, cute_x, cute_y };
      }
    }
  }

  return { ok: false };
}

export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
