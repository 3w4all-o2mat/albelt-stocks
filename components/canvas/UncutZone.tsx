"use client";

import { Rect } from "react-konva";

interface Props {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function UncutZone({ x, y, width, height }: Props) {
  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill="#E5E7EB"
      opacity={0.55}
      listening={false}
    />
  );
}
