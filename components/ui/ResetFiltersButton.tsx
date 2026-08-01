"use client";

import { RotateCcw } from "lucide-react";
import { usePathname, useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";

export function ResetFiltersButton() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  const handleReset = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("nature");
    params.delete("color");
    params.delete("plies");
    params.delete("thickness");
    params.delete("supplier");
    params.delete("country");
    params.delete("year");
    router.push(`${pathname}?${params.toString()}`);
  }, [pathname, searchParams, router]);

  return (
    <button
      type="button"
      onClick={handleReset}
      className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
    >
      <RotateCcw className="h-4 w-4" />
      <span>Réinitialiser</span>
    </button>
  );
}
