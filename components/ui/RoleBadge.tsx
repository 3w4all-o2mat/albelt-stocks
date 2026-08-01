import { cn } from "@/lib/utils";
import type { MembershipRole } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";

const STYLES: Record<MembershipRole, string> = {
  master: "bg-amber-100 text-amber-800 ring-1 ring-amber-200",
  manager: "bg-blue-100 text-blue-800 ring-1 ring-blue-200",
  user: "bg-slate-100 text-slate-700 ring-1 ring-slate-200",
};

export function RoleBadge({
  role,
  className,
}: {
  role: MembershipRole;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        STYLES[role],
        className
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}
