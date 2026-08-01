"use client";

import { Line, Text, Group } from "react-konva";

interface Props {
  /** X position of the stock piece origin (pixels) */
  offsetX: number;
  /** Y position of the stock piece origin (pixels) */
  offsetY: number;
  /** Width of the stock piece (pixels) */
  rootW: number;
  /** Height of the stock piece (pixels) */
  rootH: number;
  /** Stock longueur in mm */
  longueurMm: number;
  /** Stock largeur in mm */
  largeurMm: number;
  /** Pixels per mm (effective scale) */
  scale: number;
}

const RULER_SIZE = 28; // px – width/height of the ruler strip
const MAJOR_LEN = 10; // px – major tick length
const MID_LEN = 7;    // px – half-meter tick length
const MINOR_LEN = 4;  // px – decimeter tick length

const TICK_COLOR = "#64748b";
const LABEL_COLOR = "#334155";
const BG_COLOR = "rgba(241,245,249,0.85)";

export function MeterGradations({
  offsetX,
  offsetY,
  rootW,
  rootH,
  longueurMm,
  largeurMm,
  scale,
}: Props) {
  // Determine which sub-divisions are visible based on pixel density
  const px1m = 1000 * scale;
  const px500 = 500 * scale;
  const px100 = 100 * scale;

  const showHalf = px500 > 8;
  const showDeci = px100 > 8;

  // ── Horizontal ruler (top edge) ──────────────────────────────
  const hTicks: { x: number; len: number; label?: string }[] = [];
  for (let mm = 0; mm <= longueurMm; mm += 100) {
    const px = mm * scale;
    if (px > rootW + 1) break;

    let len = MINOR_LEN;
    let label: string | undefined;

    if (mm % 1000 === 0) {
      len = MAJOR_LEN;
      label = mm === 0 ? "0" : `${mm / 1000}m`;
    } else if (mm % 500 === 0 && showHalf) {
      len = MID_LEN;
    } else if (!showDeci) {
      continue; // skip decimeter ticks when too dense
    }

    hTicks.push({ x: offsetX + px, len, label });
  }

  // ── Vertical ruler (left edge) ───────────────────────────────
  const vTicks: { y: number; len: number; label?: string }[] = [];
  for (let mm = 0; mm <= largeurMm; mm += 100) {
    const px = mm * scale;
    if (px > rootH + 1) break;

    let len = MINOR_LEN;
    let label: string | undefined;

    if (mm % 1000 === 0) {
      len = MAJOR_LEN;
      label = mm === 0 ? "0" : `${mm / 1000}m`;
    } else if (mm % 500 === 0 && showHalf) {
      len = MID_LEN;
    } else if (!showDeci) {
      continue;
    }

    vTicks.push({ y: offsetY + px, len, label });
  }

  return (
    <Group listening={false}>
      {/* ── Horizontal ruler background ── */}
      <Line
        points={[
          offsetX, offsetY - RULER_SIZE - 2,
          offsetX + rootW, offsetY - RULER_SIZE - 2,
          offsetX + rootW, offsetY - 2,
          offsetX, offsetY - 2,
        ]}
        closed
        fill={BG_COLOR}
      />
      {/* Horizontal baseline */}
      <Line
        points={[offsetX, offsetY - 2, offsetX + rootW, offsetY - 2]}
        stroke={TICK_COLOR}
        strokeWidth={1}
      />
      {/* Horizontal ticks */}
      {hTicks.map((t, i) => (
        <Group key={`ht-${i}`}>
          <Line
            points={[t.x, offsetY - 2, t.x, offsetY - 2 - t.len]}
            stroke={TICK_COLOR}
            strokeWidth={t.len === MAJOR_LEN ? 1.5 : 0.8}
          />
          {t.label && (
            <Text
              x={t.x - 16}
              y={offsetY - RULER_SIZE - 2}
              width={32}
              align="center"
              text={t.label}
              fontSize={9}
              fill={LABEL_COLOR}
            />
          )}
        </Group>
      ))}

      {/* ── Vertical ruler background ── */}
      <Line
        points={[
          offsetX - RULER_SIZE - 2, offsetY,
          offsetX - 2, offsetY,
          offsetX - 2, offsetY + rootH,
          offsetX - RULER_SIZE - 2, offsetY + rootH,
        ]}
        closed
        fill={BG_COLOR}
      />
      {/* Vertical baseline */}
      <Line
        points={[offsetX - 2, offsetY, offsetX - 2, offsetY + rootH]}
        stroke={TICK_COLOR}
        strokeWidth={1}
      />
      {/* Vertical ticks */}
      {vTicks.map((t, i) => (
        <Group key={`vt-${i}`}>
          <Line
            points={[offsetX - 2, t.y, offsetX - 2 - t.len, t.y]}
            stroke={TICK_COLOR}
            strokeWidth={t.len === MAJOR_LEN ? 1.5 : 0.8}
          />
          {t.label && (
            <Text
              x={offsetX - RULER_SIZE - 2}
              y={t.y - 6}
              width={RULER_SIZE - 2}
              align="center"
              text={t.label}
              fontSize={9}
              fill={LABEL_COLOR}
            />
          )}
        </Group>
      ))}
    </Group>
  );
}
