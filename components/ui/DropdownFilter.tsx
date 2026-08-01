"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DropdownOption {
  value: string;
  label: string;
}

interface DropdownFilterProps {
  paramKey: string;
  /** Default label shown when nothing is selected (e.g. "Toutes les natures") */
  label: string;
  options: DropdownOption[];
  icon?: React.ReactNode;
}

export function DropdownFilter({ paramKey, label, options, icon }: DropdownFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const current = searchParams.get(paramKey) ?? "";
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

  function select(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(paramKey, value);
    else params.delete(paramKey);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    setOpen(false);
  }

  const currentOption = options.find((o) => o.value === current);
  const displayLabel = currentOption?.label ?? label;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex items-center gap-2 rounded-md border bg-white px-3 py-2 text-sm font-medium text-slate-700",
          "hover:bg-slate-50 transition-colors",
          current ? "border-orange-400" : "border-slate-300"
        )}
      >
        {icon}
        <span>{displayLabel}</span>
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
                <span>{label}</span>
                {current === "" && <Check className="h-4 w-4 text-slate-900" />}
              </button>
            </li>
            {options.map((o) => (
              <li key={o.value}>
                <button
                  type="button"
                  onClick={() => select(o.value)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-2 text-left hover:bg-slate-50",
                    current === o.value && "font-medium text-slate-900"
                  )}
                >
                  <span>{o.label}</span>
                  {current === o.value && (
                    <Check className="h-4 w-4 text-slate-900" />
                  )}
                </button>
              </li>
            ))}
            {options.length === 0 && (
              <li className="px-3 py-2 text-slate-400">Aucune option</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
