"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Label, Select } from "@/components/ui/Form";
import type { Atelier, BonAtelierStatus } from "@/lib/types";

interface BonsAtelierControlsProps {
  ateliers: Atelier[];
  selectedAtelierId: number | null;
  selectedStatus: BonAtelierStatus;
}

export function BonsAtelierControls({
  ateliers,
  selectedAtelierId,
  selectedStatus,
}: BonsAtelierControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function buildHref(atelierId: number | null, status: BonAtelierStatus): string {
    const params = new URLSearchParams(searchParams.toString());
    if (atelierId != null) params.set("atelier", String(atelierId));
    else params.delete("atelier");
    params.set("status", status);
    const qs = params.toString();
    return qs ? `/bons_atelier?${qs}` : "/bons_atelier";
  }

  return (
    <div className="flex flex-wrap items-end gap-4">
      <div className="space-y-1.5">
        <Label htmlFor="ba-atelier">Atelier</Label>
        <Select
          id="ba-atelier"
          value={selectedAtelierId ?? ""}
          onChange={(e) => {
            const value = e.target.value;
            router.push(
              buildHref(value ? Number(value) : null, selectedStatus)
            );
          }}
          className="w-60"
        >
          {ateliers.length === 0 ? (
            <option value="">Aucun atelier</option>
          ) : (
            ateliers.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
                {!a.is_active ? " (inactive)" : ""}
              </option>
            ))
          )}
        </Select>
      </div>
    </div>
  );
}