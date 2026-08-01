"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Search, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Form";
import { TypeBadge } from "@/components/ui/TypeBadge";
import {
  formatDimensions,
  formatSurface,
  typeColor,
  typeLabel,
} from "@/lib/utils";
import type { Category, StockPiece } from "@/lib/types";

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  if (!res.ok) throw new Error("Impossible de charger les catégories");
  return (await res.json()) as Category[];
}

type AvailabilityResponse = {
  success: boolean;
  data?: {
    bo: StockPiece[];
    cs: StockPiece[];
    si: StockPiece[];
  };
  error?: string;
};

interface AvailabilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  atelier: string | null;
  allowedAteliers: string[];
}

const GROUPS: { key: "bo" | "cs" | "si"; label: string }[] = [
  { key: "bo", label: "Bobines" },
  { key: "cs", label: "Chutes stockées" },
  { key: "si", label: "Stock initial" },
];

export function AvailabilityModal({
  isOpen,
  onClose,
  atelier,
}: AvailabilityModalProps) {
  const [stkCategoryId, setStkCategoryId] = useState("");
  const [longueur, setLongueur] = useState("");
  const [largeur, setLargeur] = useState("");

  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
    enabled: isOpen,
  });

  const searchMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stk_category_id: Number(stkCategoryId),
          longueur: Number(longueur),
          largeur: Number(largeur),
          atelier,
        }),
      });
      const data = (await res.json()) as AvailabilityResponse;
      if (!res.ok || !data.success) {
        throw new Error(data.error ?? "Erreur lors de la recherche");
      }
      return data.data!;
    },
  });

  useEffect(() => {
    if (!isOpen) {
      setStkCategoryId("");
      setLongueur("");
      setLargeur("");
      searchMutation.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (isOpen) {
      document.addEventListener("keydown", onKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const canSubmit =
    stkCategoryId && Number(longueur) > 0 && Number(largeur) > 0;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    searchMutation.mutate();
  }

  const results = searchMutation.data;
  const hasResults =
    results && (results.bo.length > 0 || results.cs.length > 0 || results.si.length > 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative mx-4 flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Vérifier la disponibilité
            </h2>
            <p className="text-xs text-slate-500">
              Recherche dans les bobines, chutes stockées et stock initial.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <form onSubmit={submit} className="grid gap-4">
            <Field label="Catégorie de bobine">
              <Select
                value={stkCategoryId}
                onChange={(e) => setStkCategoryId(e.target.value)}
                disabled={categoriesLoading}
                required
              >
                <option value="">— Choisir une catégorie —</option>
                {categories?.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.nature} · {c.color} · {c.thickness} ·{" "}
                    {c.plies} · {c.motif}
                  </option>
                ))}
              </Select>
            </Field>

            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <h3 className="mb-3 text-sm font-medium text-slate-900">
                Dimensions
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Longueur (mm)">
                  <Input
                    type="number"
                    min={1}
                    value={longueur}
                    onChange={(e) => setLongueur(e.target.value)}
                    required
                  />
                </Field>
                <Field label="Largeur (mm)">
                  <Input
                    type="number"
                    min={1}
                    value={largeur}
                    onChange={(e) => setLargeur(e.target.value)}
                    required
                  />
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={!canSubmit || searchMutation.isPending}
              >
                {searchMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Vérification…
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    Vérifier l&apos;existence
                  </>
                )}
              </Button>
            </div>
          </form>

          {searchMutation.isError && (
            <div className="mt-4 rounded-md bg-cp/10 px-3 py-2 text-sm text-cp">
              {searchMutation.error.message}
            </div>
          )}

          {results && !searchMutation.isPending && (
            <div className="mt-6">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">
                Résultats
              </h3>

              {!hasResults ? (
                <p className="rounded-md bg-slate-50 px-3 py-4 text-center text-sm text-slate-600">
                  Aucune pièce ne permet cette découpe.
                </p>
              ) : (
                <div className="space-y-4">
                  {GROUPS.map(({ key, label }) => {
                    const pieces = results[key];
                    if (pieces.length === 0) return null;
                    return (
                      <div key={key}>
                        <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                          <span
                            className="inline-block h-2 w-2 rounded-full"
                            style={{ backgroundColor: typeColor(key.toUpperCase() as StockPiece["type"]) }}
                          />
                          {label}
                        </h4>
                        <div className="divide-y divide-slate-100 rounded-md border border-slate-200">
                          {pieces.map((piece) => (
                            <div
                              key={piece.id}
                              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
                            >
                              <div className="flex items-center gap-2">
                                <TypeBadge type={piece.type} />
                                <span className="font-medium text-slate-900">
                                  {piece.name ?? `#${piece.id}`}
                                </span>
                              </div>
                              <div className="flex flex-wrap items-center gap-3 text-slate-600">
                                <span>
                                  {formatDimensions(
                                    piece.longueur,
                                    piece.largeur
                                  )}
                                </span>
                                <span>
                                  Reste :{" "}
                                  {formatSurface(piece.surface_restante)}
                                </span>
                                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs">
                                  {piece.atelier}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
