"use client";

import { Rect, Text } from "react-konva";
import type { StockPiece } from "@/lib/types";
import { TYPE_COLORS } from "@/lib/types";

interface Props {
  piece: StockPiece;
  scale: number;
  offsetX: number;
  offsetY: number;
  onHover: (piece: StockPiece | null, x: number, y: number) => void;
  onClick: (piece: StockPiece) => void;
}

export function CutRect({
  piece,
  scale,
  offsetX,
  offsetY,
  onHover,
  onClick,
}: Props) {
  const x = offsetX + piece.cute_x * scale;
  const y = offsetY + piece.cute_y * scale;
  const w = piece.longueur * scale;
  const h = piece.largeur * scale;
  const color = TYPE_COLORS[piece.type];

  return (
    <>
      <Rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill={color}
        opacity={0.85}
        stroke="#0f172a"
        strokeWidth={1}
        cornerRadius={2}
        onMouseEnter={(e) => {
          const stage = e.target.getStage();
          const pos = stage?.getPointerPosition();
          onHover(piece, pos?.x ?? 0, pos?.y ?? 0);
        }}
        onMouseMove={(e) => {
          const stage = e.target.getStage();
          const pos = stage?.getPointerPosition();
          onHover(piece, pos?.x ?? 0, pos?.y ?? 0);
        }}
        onMouseLeave={() => onHover(null, 0, 0)}
        onClick={() => onClick(piece)}
        onTap={() => onClick(piece)}
      />
      {w > 50 && h > 24 && (
        <Text
          x={x + 4}
          y={y + 4}
          width={w - 8}
          text={`${piece.type}`}
          fontSize={11}
          fontStyle="bold"
          fill="#ffffff"
          listening={false}
        />
      )}
      {w > 50 && h > 44 && (
        <Text
          x={x + 4}
          y={y + 18}
          width={w - 8}
          text={`${piece.longueur}×${piece.largeur}`}
          fontSize={10}
          fill="#ffffff"
          listening={false}
        />
      )}
    </>
  );
}
