"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import type { Atelier, Category } from "@/lib/types";

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch("/api/categories");
  return (await res.json()) as Category[];
}
async function fetchAteliers(): Promise<Atelier[]> {
  const res = await fetch("/api/ateliers");
  if (!res.ok) throw new Error("Failed to load ateliers");
  return (await res.json()) as Atelier[];
}

export default function AddStockInitialButton({
  defaultAtelier = "",
}: {
  defaultAtelier?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [stk_category_id, setCategoryId] = useState("");
  const [longueur, setLongueur] = useState("");
  const [largeur, setLargeur] = useState("");
  const [atelier, setAtelier] = useState(defaultAtelier);
  const [observation, setObservation] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ["si-categories"],
    queryFn: fetchCategories,
    enabled: open,
  });
  const { data: ateliers } = useQuery({
    queryKey: ["si-ateliers"],
    queryFn: fetchAteliers,
    enabled: open,
  });

  const siCategories = useMemo(
    () => (categories ?? []).filter((c) => c.si_active),
    [categories]
  );

  const surface = useMemo(() => {
    const l = Number(longueur);
    const w = Number(largeur);
    if (!longueur || !largeur || l <= 0 || w <= 0) return null;
    return Math.floor((l * w) / 1_000_000);
  }, [longueur, largeur]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "SI",
          stk_category_id: Number(stk_category_id),
          longueur: Number(longueur),
          largeur: Number(largeur),
          atelier,
          observation: observation || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur lors de la création");
      }
      return res.json();
    },
    onSuccess: () => {
      setOpen(false);
      setCategoryId("");
      setLongueur("");
      setLargeur("");
      setObservation("");
      setError(null);
      router.refresh();
    },
    onError: (e: Error) => setError(e.message),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!stk_category_id || !longueur || !largeur || !atelier) {
      setError("Tous les champs obligatoires doivent être remplis.");
      return;
    }
    mutation.mutate();
  }

  function close() {
    setOpen(false);
    setError(null);
  }

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        + Ajouter Stock Initial
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
          onClick={close}
        >
          <div
            className="relative mx-4 w-full max-w-lg rounded-xl bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
              <h2 className="text-base font-semibold text-slate-900">
                Ajouter un Stock Initial
              </h2>
              <button
                type="button"
                onClick={close}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Fermer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="grid gap-4 p-5">
              <Field label="Catégorie (Stock Initial actif)">
                <Select
                  value={stk_category_id}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                >
                  <option value="">— Choisir —</option>
                  {siCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} · {c.nature} · {c.color} · {c.thickness}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Atelier">
                <Select
                  value={atelier}
                  onChange={(e) => setAtelier(e.target.value)}
                  required
                >
                  <option value="">— Choisir —</option>
                  {ateliers?.map((a) => (
                    <option key={a.id} value={a.name}>
                      {a.name}
                    </option>
                  ))}
                </Select>
              </Field>

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

              <div className="flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
                <span className="font-medium">Surface :</span>
                <span>{surface != null ? `${surface} m²` : "—"}</span>
              </div>

              <Field label="Observation" hint="Optionnel">
                <Textarea
                  rows={2}
                  value={observation}
                  onChange={(e) => setObservation(e.target.value)}
                />
              </Field>

              {error && (
                <p className="rounded-md bg-cp/10 px-3 py-2 text-sm text-cp">
                  {error}
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button type="button" variant="secondary" onClick={close}>
                  Annuler
                </Button>
                <Button type="submit" disabled={mutation.isPending}>
                  {mutation.isPending ? "Enregistrement…" : "Enregistrer"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
