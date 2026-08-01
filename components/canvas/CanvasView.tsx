"use client";

import { useQuery } from "@tanstack/react-query";
import { StockCanvas } from "@/components/canvas/StockCanvas";
import type { StockPiece } from "@/lib/types";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch " + url);
  return res.json() as Promise<T>;
}

export function CanvasView({ id }: { id: number }) {
  const { data: root } = useQuery<StockPiece>({
    queryKey: ["piece", id],
    queryFn: () => fetchJson<StockPiece>(`/api/stocks/${id}`),
  });
  const { data: children } = useQuery<StockPiece[]>({
    queryKey: ["children", id],
    queryFn: () => fetchJson<StockPiece[]>(`/api/stocks/${id}/children`),
  });

  if (!root) return <p className="text-sm text-slate-500">Chargement…</p>;
  return (
    <StockCanvas root={root} children={children ?? []} />
  );
}
