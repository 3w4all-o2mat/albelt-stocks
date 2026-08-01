"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState } from "react";
import { Search, X, ChevronDown, ChevronUp, Filter } from "lucide-react";

interface AdvancedFiltersProps {
  /** Currently active cmdName filter value */
  cmdName?: string;
  /** Currently active clientName filter value */
  clientName?: string;
}

export function AdvancedFilters({ cmdName, clientName }: AdvancedFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [collapsed, setCollapsed] = useState(false);
  const [cmdNameInput, setCmdNameInput] = useState(cmdName ?? "");
  const [clientNameInput, setClientNameInput] = useState(clientName ?? "");

  const handleCmdNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setCmdNameInput(e.target.value);
    },
    []
  );

  const handleClientNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setClientNameInput(e.target.value);
    },
    []
  );

  const applyFilters = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (cmdNameInput) params.set("cmd_name", cmdNameInput);
    else params.delete("cmd_name");
    if (clientNameInput) params.set("client_name", clientNameInput);
    else params.delete("client_name");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [cmdNameInput, clientNameInput, pathname, searchParams, router]);

  const handleReset = useCallback(() => {
    setCmdNameInput("");
    setClientNameInput("");
    const params = new URLSearchParams(searchParams.toString());
    params.delete("cmd_name");
    params.delete("client_name");
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }, [pathname, searchParams, router]);

  const hasActiveFilters = !!(cmdName || clientName);

  return (
    <div className="mt-4 rounded-xl border bg-white shadow-sm">
      <details className="group" open={hasActiveFilters}>
        <summary className="flex cursor-pointer items-center justify-between px-5 py-4 border-b border-slate-100 list-none [&::-webkit-details-marker]:hidden">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-cyan-500" />
            <h3 className="text-base font-semibold text-cyan-500">Filtres avancés</h3>
            <p className="mt-0.5 text-sm text-slate-500">Recherchez par numéro de commande ou client</p>
          </div>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <span className="inline-flex items-center justify-center h-5 min-w-5 rounded-full bg-purple-100 px-1.5 text-xs font-medium text-purple-700">
                {hasActiveFilters ? 1 : 0}
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" />
          </div>
        </summary>
        <div className="p-5">
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="cmd_name_filter"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                N° commande
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="cmd_name_filter"
                  type="text"
                  value={cmdNameInput}
                  onChange={handleCmdNameChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyFilters();
                  }}
                  placeholder="Rechercher une commande..."
                  className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 min-w-[200px]">
              <label
                htmlFor="client_name_filter"
                className="mb-1 block text-xs font-medium text-slate-600"
              >
                Client
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  id="client_name_filter"
                  type="text"
                  value={clientNameInput}
                  onChange={handleClientNameChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") applyFilters();
                  }}
                  placeholder="Rechercher un client..."
                  className="w-full rounded-md border border-slate-300 bg-white py-1.5 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={applyFilters}
              className="rounded-md bg-blue-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Filtrer
            </button>
          </div>
        </div>
      </details>
    </div>
  );
}
