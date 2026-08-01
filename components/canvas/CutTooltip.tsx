"use client";

import type { StockPiece } from "@/lib/types";
import { TYPE_LABELS } from "@/lib/types";
import { formatDimensions, formatDate, typeLabel } from "@/lib/utils";

interface Props {
  piece: StockPiece | null;
  x: number;
  y: number;
}

export function CutTooltip({ piece, x, y }: Props) {
  if (!piece) return null;
  return (
    <div
      className="pointer-events-none absolute z-20 max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left: x + 12, top: y + 12 }}
    >
      <div className="font-semibold text-slate-900">
        {typeLabel(piece.type)}
        {piece.name ? ` · ${piece.name}` : ""}
      </div>
      <div className="mt-0.5 text-slate-600">
        {formatDimensions(piece.longueur, piece.largeur)}
      </div>
      <div className="text-slate-500">
        Position : {piece.cute_x}, {piece.cute_y} mm
      </div>
      {piece.type === "CC" && (
        <div className="text-slate-600">
          Commande : {piece.cmd_name ?? "—"}
        </div>
      )}
      {piece.observation && (
        <div className="mt-1 italic text-slate-500">
          « {piece.observation} »
        </div>
      )}
      <div className="mt-1 text-slate-400">
        Créé le {formatDate(piece.create_date)}
      </div>
    </div>
  );
}

export { TYPE_LABELS };
