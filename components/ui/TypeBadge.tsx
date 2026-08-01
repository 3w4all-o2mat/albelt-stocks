import { cn } from "@/lib/utils";
import type { PieceType } from "@/lib/types";

const STYLES: Record<PieceType, string> = {
  BO: "bg-purple-700 text-white",
  CC: "bg-cc text-white",
  CS: "bg-cs text-white",
  CP: "bg-cp text-white",
  SI: "bg-green-600 text-white",
};

const LABELS: Record<PieceType, string> = {
  BO: "Bobine",
  CC: "Coupe Commande",
  CS: "Chute Stockée",
  CP: "Chute Perdue",
  SI: "Stock Initial",
};

export function TypeBadge({
  type,
  className,
}: {
  type: PieceType;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium min-w-[120px]",
        STYLES[type],
        className
      )}
    >
      {LABELS[type]}
    </span>
  );
}
