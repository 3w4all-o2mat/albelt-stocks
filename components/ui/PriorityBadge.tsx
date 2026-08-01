import { cn } from "@/lib/utils";

const PRIORITY_CONFIG: Record<
  number,
  { label: string; style: string }
> = {
  1: {
    label: "عادي",
    style: "bg-green-100 text-green-800 ring-1 ring-green-300",
  },
  2: {
    label: "مستعجل",
    style: "bg-orange-100 text-orange-800 ring-1 ring-orange-300",
  },
  3: {
    label: "مستعجل جدا",
    style: "bg-red-100 text-red-800 ring-1 ring-red-300",
  },
};

export function PriorityBadge({
  priority,
  className,
}: {
  priority: number | null;
  className?: string;
}) {
  if (priority == null) return null;

  const config = PRIORITY_CONFIG[priority];
  if (!config) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-sm font-bold",
        config.style,
        className
      )}
    >
      {config.label}
    </span>
  );
}
