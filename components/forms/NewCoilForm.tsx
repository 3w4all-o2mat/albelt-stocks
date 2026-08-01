"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Form";
import { getAllCategories } from "@/lib/queries/categories";
import { createBO } from "@/lib/queries/stocks";
import type { Atelier, Supplier } from "@/lib/types";

async function fetchCategories() {
  const res = await fetch("/api/categories");
  return (await res.json()) as Awaited<ReturnType<typeof getAllCategories>>;
}

async function fetchAteliers() {
  const res = await fetch("/api/ateliers");
  if (!res.ok) throw new Error("Failed to load ateliers");
  return (await res.json()) as Atelier[];
}

async function fetchSuppliers() {
  const res = await fetch("/api/suppliers");
  if (!res.ok) throw new Error("Failed to load suppliers");
  return (await res.json()) as Supplier[];
}

export function NewCoilForm({ defaultAtelier = "" }: { defaultAtelier?: string }) {
  const router = useRouter();
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  const { data: ateliers, isLoading: ateliersLoading } = useQuery({
    queryKey: ["ateliers"],
    queryFn: fetchAteliers,
  });

  const { data: suppliers, isLoading: suppliersLoading } = useQuery({
    queryKey: ["suppliers"],
    queryFn: fetchSuppliers,
  });

  const [stk_category_id, setCategoryId] = useState("");
  const [longueur, setLongueur] = useState("");
  const [largeur, setLargeur] = useState("");
  const [atelier, setAtelier] = useState(defaultAtelier);
  const [observation, setObservation] = useState("");
  const [supplier_id, setSupplierId] = useState("");
  const [year, setYear] = useState("");
  const [error, setError] = useState<string | null>(null);

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
          stk_category_id: Number(stk_category_id),
          longueur: Number(longueur),
          largeur: Number(largeur),
          atelier,
          observation: observation || null,
          supplier_id: supplier_id ? Number(supplier_id) : null,
          year: year ? Number(year) : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Erreur lors de la création");
      }
      return res.json();
    },
    onSuccess: (bo) => {
      router.push(`/coils/${bo.id}`);
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

  return (
    <Card>
      <CardHeader
        title="Nouvelle bobine (BO)"
        subtitle="Enregistrer une nouvelle bobine source dans le stock."
      />
      <CardBody>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Catégorie / Nature">
            <Select
              value={stk_category_id}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={categoriesLoading}
              required
            >
              <option value="">— Choisir —</option>
              {categories?.map((c) => (
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
              disabled={ateliersLoading}
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

          {surface != null && (
            <div className="sm:col-span-2 flex items-center gap-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-600">
              <span className="font-medium">Surface :</span>
              <span>
                {Number(longueur)} mm × {Number(largeur)} mm ={" "}
                <strong>{surface} m²</strong>
              </span>
            </div>
          )}

          <Field label="Fournisseur" hint="Optionnel">
            <Select
              value={supplier_id}
              onChange={(e) => setSupplierId(e.target.value)}
              disabled={suppliersLoading}
            >
              <option value="">— Aucun —</option>
              {suppliers?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}{s.country_name ? ` (${s.country_name})` : ""}
                </option>
              ))}
            </Select>
          </Field>

          <Field label="Année de fabrication" hint="Optionnel">
            <Input
              type="number"
              min={1900}
              max={2026}
              value={year}
              onChange={(e) => setYear(e.target.value)}
              placeholder="e.g. 2025"
            />
          </Field>

          <div className="sm:col-span-2">
            <Field label="Observation" hint="Optionnel">
              <Textarea
                rows={2}
                value={observation}
                onChange={(e) => setObservation(e.target.value)}
              />
            </Field>
          </div>

          {error && (
            <p className="sm:col-span-2 rounded-md bg-cp/10 px-3 py-2 text-sm text-cp">
              {error}
            </p>
          )}

          <div className="sm:col-span-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.back()}
            >
              Annuler
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Création…" : "Créer la bobine"}
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  );
}
