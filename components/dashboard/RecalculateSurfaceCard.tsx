"use client";

import { useMutation } from "@tanstack/react-query";
import { RotateCw } from "lucide-react";
import { useState } from "react";
import { Card, CardBody } from "@/components/ui/Card";
import { formatSurface } from "@/lib/utils";

interface Props {
  coilId: number;
  initialSurfaceRestante: number | null;
}

export function RecalculateSurfaceCard({
  coilId,
  initialSurfaceRestante,
}: Props) {
  const [value, setValue] = useState<number | null>(initialSurfaceRestante);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/stocks/${coilId}/recalculate-surface`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur lors du recalcul");
      }
      return res.json() as Promise<{ surface_restante: number }>;
    },
    onSuccess: (data) => {
      setValue(data.surface_restante);
    },
  });

  return (
    <Card>
      <CardBody className="py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase text-slate-500">
              Surface restante
            </div>
            <div className="mt-1 text-sm font-semibold text-slate-900">
              {formatSurface(value)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="rounded-full p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition disabled:opacity-50"
            title="Recalculer la surface restante"
          >
            <RotateCw
              className={
                mutation.isPending ? "h-4 w-4 animate-spin" : "h-4 w-4"
              }
            />
          </button>
        </div>
      </CardBody>
    </Card>
  );
}
