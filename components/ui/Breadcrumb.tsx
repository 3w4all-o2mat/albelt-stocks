"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import type { Ancestor } from "@/lib/types";
import { cn } from "@/lib/utils";

function buildHref(base: string, query: string): string {
  return query ? `${base}?${query}` : base;
}

export function Breadcrumb({
  ancestors,
  className,
}: {
  ancestors: Ancestor[];
  className?: string;
}) {
  const searchParams = useSearchParams();
  const query = searchParams.toString();

  if (!ancestors.length) return null;
  return (
    <nav
      className={cn(
        "flex flex-wrap items-center gap-1 text-sm text-slate-500",
        className
      )}
      aria-label="Breadcrumb"
    >
      {ancestors.map((a, i) => {
        const isLast = i === ancestors.length - 1;
        const base = a.type === "BO" ? `/coils/${a.id}` : `/cs/${a.id}`;
        const href = buildHref(base, query);
        return (
          <span key={a.id} className="flex items-center gap-1">
            {i > 0 && (
              <ChevronRight className="h-3.5 w-3.5 text-slate-300" />
            )}
            {isLast ? (
              <span className="font-medium text-slate-900">
                {a.name ?? a.chained_name ?? `#${a.id}`}
              </span>
            ) : (
              <Link href={href} className="hover:text-slate-900">
                {a.name ?? a.chained_name ?? `#${a.id}`}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
