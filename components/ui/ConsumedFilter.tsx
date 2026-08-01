"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Check, CircleDot } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConsumedFilterValue = "active" | "consumed" | "all";

interface ConsumedFilterProps {
  value: ConsumedFilterValue;
}

const OPTIONS: { value: ConsumedFilterValue; label: string }[] = [
  { value: "active", label: "Non consommées" },
  { value: "consumed", label: "Consommées" },
  { value: "all", label: "Toutes les bobines" },
];

export function ConsumedFilter({ value }: ConsumedFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

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

  function select(v: ConsumedFilterValue) {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "all") params.delete("consumed");
    else params.set("consumed", v);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  }

  const label = OPTIONS.find((o) => o.value === value)?.label ?? "Non consommées";

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
        <CircleDot className="h-4 w-4 text-slate-500" />
        <span>{label}</span>
        <ChevronDown className="h-4 w-4 text-slate-400" />
      </button>

      {open && (
        <div className="absolute z-20 mt-1 w-56 overflow-hidden rounded-md border border-slate-200 bg-white shadow-lg">
          <ul className="max-h-72 overflow-auto py-1 text-sm">
            {OPTIONS.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => select(o.value)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50",
                    value === o.value && "font-medium text-slate-900"
                  )}
                >
                  <span>{o.label}</span>
                  {value === o.value && (
                    <Check className="h-4 w-4 text-slate-900" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}