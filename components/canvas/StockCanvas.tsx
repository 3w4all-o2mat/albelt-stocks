"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Layer, Rect, Stage } from "react-konva";
import type Konva from "konva";
import { useRouter } from "next/navigation";
import type { StockPiece } from "@/lib/types";
import { computeScale } from "@/lib/utils";
import { CutRect } from "./CutRect";
import { UncutZone } from "./UncutZone";
import { CutTooltip } from "./CutTooltip";
import { MeterGradations } from "./MeterGradations";

interface Props {
  root: StockPiece;
  children: StockPiece[];
  maxHeight?: number;
}

const PADDING = 70;

export function StockCanvas({
  root,
  children,
  maxHeight = 560,
}: Props) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [size, setSize] = useState({ width: 0, height: maxHeight });
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState<{ piece: StockPiece | null; x: number; y: number }>(
    { piece: null, x: 0, y: 0 }
  );

  // Responsive width — fill the full container width
  useEffect(() => {
    function update() {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      setSize({ width: w, height: maxHeight });
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [maxHeight]);

  const baseScale = useMemo(
    () =>
      computeScale(
        root.longueur,
        root.largeur,
        size.width - PADDING * 2,
        size.height - PADDING * 2
      ),
    [root.longueur, root.largeur, size]
  );

  const effectiveScale = baseScale * zoom;
  const ready = size.width > 0 && baseScale > 0;

  const rootW = root.longueur * effectiveScale;
  const rootH = root.largeur * effectiveScale;
  const offsetX = (size.width - rootW) / 2;
  const offsetY = (size.height - rootH) / 2;

  function handleWheel(e: Konva.KonvaEventObject<WheelEvent>) {
    e.evt.preventDefault();
    if (e.evt.ctrlKey) {
      // Trackpad pinch (or Ctrl + wheel) → zoom
      const factor = e.evt.deltaY > 0 ? 0.9 : 1.1;
      setZoom((z) => Math.min(10, Math.max(0.2, z * factor)));
    } else {
      // Trackpad two-finger drag (or mouse wheel) → pan in the same direction
      setPos((p) => ({
        x: p.x - e.evt.deltaX,
        y: p.y - e.evt.deltaY,
      }));
    }
  }

  function handleClick(piece: StockPiece) {
    if (piece.type === "CS") {
      router.push(`/falls/${piece.id}`);
    } else if (piece.type === "BO") {
      router.push(`/coils/${piece.id}`);
    }
    // CC / CP : tooltip already shows details; could open side panel
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-50"
      style={{ height: maxHeight }}
    >
      {ready && (
        <>
      <Stage
        ref={stageRef}
        width={size.width}
        height={size.height}
        onWheel={handleWheel}
        draggable
        onDragEnd={(e) => setPos({ x: e.target.x(), y: e.target.y() })}
        x={pos.x}
        y={pos.y}
      >
        <Layer>
          {/* Meter gradations (rulers) */}
          <MeterGradations
            offsetX={offsetX}
            offsetY={offsetY}
            rootW={rootW}
            rootH={rootH}
            longueurMm={root.longueur}
            largeurMm={root.largeur}
            scale={effectiveScale}
          />

          {/* Uncut background = full source in grey */}
          <UncutZone x={offsetX} y={offsetY} width={rootW} height={rootH} />

          {/* Source border */}
          <Rect
            x={offsetX}
            y={offsetY}
            width={rootW}
            height={rootH}
            stroke="#1F2937"
            strokeWidth={2}
            listening={false}
            cornerRadius={3}
          />

          {/* Cuts */}
          {children.map((c) => (
            <CutRect
              key={c.id}
              piece={c}
              scale={effectiveScale}
              offsetX={offsetX}
              offsetY={offsetY}
              onHover={(piece, x, y) =>
                setHover({ piece, x: x + pos.x, y: y + pos.y })
              }
              onClick={handleClick}
            />
          ))}
        </Layer>
      </Stage>

      <CutTooltip piece={hover.piece} x={hover.x} y={hover.y} />

      <div className="absolute bottom-3 right-3 flex items-center gap-2 rounded-md bg-white/90 px-2 py-1 text-xs text-slate-600 shadow">
        <button
          className="px-1.5 hover:text-slate-900"
          onClick={() => setZoom((z) => Math.min(10, z * 1.2))}
        >
          +
        </button>
        <span>{Math.round(zoom * 100)}%</span>
        <button
          className="px-1.5 hover:text-slate-900"
          onClick={() => setZoom((z) => Math.max(0.2, z / 1.2))}
        >
          −
        </button>
        <button
          className="ml-1 text-slate-400 hover:text-slate-900"
          onClick={() => {
            setZoom(1);
            setPos({ x: 0, y: 0 });
          }}
        >
          reset
        </button>
      </div>

      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-3 rounded-md bg-white/90 px-3 py-1.5 text-xs shadow">
        <Legend color="#3B82F6" label="CC" />
        <Legend color="#F59E0B" label="CS" />
        <Legend color="#EF4444" label="CP" />
        <Legend color="#E5E7EB" label="Non coupé" />
      </div>
      </>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5 text-slate-600">
      <span
        className="inline-block h-3 w-3 rounded-sm border border-slate-300"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
