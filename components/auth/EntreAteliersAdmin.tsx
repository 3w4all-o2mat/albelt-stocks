"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { Atelier, StockPiece } from "@/lib/types";
import { formatDimensions, formatDate } from "@/lib/utils";
import { TypeBadge } from "@/components/ui/TypeBadge";

// ---------------------------------------------------------------------------
// Type filter options
// ---------------------------------------------------------------------------

type TypeOption = { label: string; value: "" | StockPiece["type"] };

const TYPE_OPTIONS: TypeOption[] = [
  { label: "Tous", value: "" },
  { label: "Bobines", value: "BO" },
  { label: "Commandes coupées", value: "CC" },
  { label: "Chutes stockées", value: "CS" },
  { label: "Chutes perdues", value: "CP" },
  { label: "Chutes initiales", value: "SI" },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function EntreAteliersAdmin() {
  const [items, setItems] = useState<StockPiece[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 40;

  const [typeFilter, setTypeFilter] = useState<"" | StockPiece["type"]>("");

  const [transferItem, setTransferItem] = useState<StockPiece | null>(null);
  const [ateliers, setAteliers] = useState<Atelier[]>([]);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState<string | null>(null);

  // -----------------------------------------------------------------------
  // Fetch stocks
  // -----------------------------------------------------------------------

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (typeFilter) params.set("type", typeFilter);
      const res = await fetch(`/api/admin/entre-ateliers?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load stock items");
        return;
      }
      setItems(data.data.items as StockPiece[]);
      setTotal(data.data.total as number);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter]);

  useEffect(() => {
    fetchStocks();
  }, [fetchStocks]);

  // -----------------------------------------------------------------------
  // Fetch ateliers (for transfer modal)
  // -----------------------------------------------------------------------

  const fetchAteliers = useCallback(async () => {
    try {
      const res = await fetch("/api/ateliers", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as Atelier[];
        setAteliers(data);
      }
    } catch {
      // Silently fail — the modal will just show nothing
    }
  }, []);

  useEffect(() => {
    fetchAteliers();
  }, [fetchAteliers]);

  // -----------------------------------------------------------------------
  // Pagination helpers
  // -----------------------------------------------------------------------

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function goToPage(p: number) {
    setPage(Math.max(1, Math.min(totalPages, p)));
  }

  // -----------------------------------------------------------------------
  // Type filter handler
  // -----------------------------------------------------------------------

  function handleTypeChange(value: "" | StockPiece["type"]) {
    setTypeFilter(value);
    setPage(1);
  }

  // -----------------------------------------------------------------------
  // Transfer handlers
  // -----------------------------------------------------------------------

  function openTransfer(item: StockPiece) {
    setTransferItem(item);
    setTransferError(null);
  }

  function closeTransfer() {
    setTransferItem(null);
    setTransferError(null);
  }

  async function handleTransfer(newAtelier: string) {
    if (!transferItem) return;
    setTransferring(true);
    setTransferError(null);
    try {
      const res = await fetch(
        `/api/admin/entre-ateliers/${transferItem.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ atelier: newAtelier }),
        }
      );
      const data = await res.json();
      if (!res.ok || !data.success) {
        setTransferError(data.error || "Failed to transfer item");
        return;
      }
      closeTransfer();
      fetchStocks();
    } catch {
      setTransferError("Network error. Please try again.");
    } finally {
      setTransferring(false);
    }
  }

  // -----------------------------------------------------------------------
  // Available destination ateliers for the modal
  // -----------------------------------------------------------------------

  const availableAteliers = transferItem
    ? ateliers.filter((a) => a.name !== transferItem.atelier)
    : [];

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <div className="space-y-4">
      {/* Type filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-cyan-500 mr-1">Filtrer par type :</span>
        {TYPE_OPTIONS.map((opt) => {
          const active = typeFilter === opt.value;
          const activeBg: Record<string, string> = {
            "Tous": "bg-black",
            "Bobines": "bg-purple-700",
            "Commandes coupées": "bg-blue-700",
            "Chutes stockées": "bg-orange-600",
            "Chutes perdues": "bg-red-700",
            "Chutes initiales": "bg-green-700",
          };
          return (
            <button
              key={opt.value || "all"}
              type="button"
              onClick={() => handleTypeChange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? `${activeBg[opt.label] || "bg-purple-700"} text-white shadow-sm`
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-800"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Error banner */}
      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">Nom</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3 text-center">Dimensions</th>
              <th className="px-4 py-3 text-center">Atelier</th>
              <th className="px-4 py-3">Date / Heure</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  <Loader2 className="inline-block h-5 w-5 animate-spin" />
                  <span className="ml-2">Chargement…</span>
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                  Aucune pièce trouvée.
                </td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900 whitespace-nowrap">
                    {item.name ?? item.chained_name ?? `#${item.id}`}
                  </td>
                  <td className="px-4 py-3">
                    <TypeBadge type={item.type} />
                  </td>
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap text-center">
                    {formatDimensions(item.longueur, item.largeur)}
                  </td>
                  <td className="px-4 py-3 text-slate-700 whitespace-nowrap text-center">
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                      {item.atelier}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {formatDate(item.create_date)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center gap-1">
                      <button
                        onClick={() => openTransfer(item)}
                        className="rounded-md p-1.5 text-red-600 hover:bg-red-50 hover:text-red-800"
                        aria-label={`Transférer ${item.name ?? item.id}`}
                        title="Transférer"
                      >
                        <ArrowLeftRight className="h-4 w-4" strokeWidth={2.5} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>
          {total} pièce{total === 1 ? "" : "s"} · page {page} sur {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => goToPage(page - 1)}
          >
            Précédent
          </Button>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => goToPage(page + 1)}
          >
            Suivant
          </Button>
        </div>
      </div>

      {/* Transfer modal */}
      {transferItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h3 className="text-base font-semibold text-slate-900">
                Choisir l&apos;atelier destination
              </h3>
              <button
                onClick={closeTransfer}
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Fermer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-5 py-4">
              <p className="mb-4 text-sm text-slate-500">
                Pièce :{" "}
                <span className="font-medium text-slate-700">
                  {transferItem.name ?? transferItem.chained_name ?? `#${transferItem.id}`}
                </span>
                <br />
                Atelier actuel :{" "}
                <span className="font-medium text-slate-700">
                  {transferItem.atelier}
                </span>
              </p>

              {transferError && (
                <p className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {transferError}
                </p>
              )}

              <div className="space-y-2">
                {availableAteliers.length === 0 ? (
                  <p className="text-sm text-slate-400">
                    Aucun autre atelier disponible.
                  </p>
                ) : (
                  availableAteliers.map((atelier) => (
                    <button
                      key={atelier.id}
                      type="button"
                      disabled={transferring}
                      onClick={() => handleTransfer(atelier.name)}
                      className="w-full rounded-md border border-slate-200 px-4 py-3 text-center text-sm font-medium text-slate-700 transition-colors hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 disabled:opacity-50"
                    >
                      {transferring ? (
                        <span className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Transfert en cours…
                        </span>
                      ) : (
                        <>Transférer à {atelier.name}</>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 px-5 py-4">
              <Button
                type="button"
                variant="secondary"
                onClick={closeTransfer}
                disabled={transferring}
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
