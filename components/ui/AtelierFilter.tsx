"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Check, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Atelier } from "@/lib/types";

interface AtelierFilterProps {
  ateliers: Atelier[];
}

export function AtelierFilter({ ateliers }: AtelierFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get("atelier") ?? "";
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function select(name: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (name) params.set("atelier", name);
    else params.delete("atelier");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  }

  const currentAtelier = ateliers.find((a) => a.name === current);
  const label = current
    ? `${currentAtelier?.code ?? ''} - ${currentAtelier?.name ?? current}`
    : "Tous les ateliers";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700",
          "hover:bg-slate-50 transition-colors"
        )}
      >
        <Building2 className="h-4 w-4 text-slate-500" />
        <span>{label}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <ul className="max-h-72 overflow-auto py-1 text-sm">
            <li>
              <button
                type="button"
                onClick={() => select("")}
                className={cn(
                  "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50",
                  current === "" && "font-medium text-slate-900"
                )}
              >
                <span>Tous les ateliers</span>
                {current === "" && <Check className="h-4 w-4 text-slate-900" />}
              </button>
            </li>
            {ateliers.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  onClick={() => select(a.name)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50",
                    current === a.name && "font-medium text-slate-900"
                  )}
                >
                  <span>{a.name}</span>
                  {current === a.name && (
                    <Check className="h-4 w-4 text-slate-900" />
                  )}
                </button>
              </li>
            ))}
            {ateliers.length === 0 && (
              <li className="px-3 py-2 text-slate-400">Aucun atelier</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}