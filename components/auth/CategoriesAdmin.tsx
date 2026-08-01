"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Form";
import type { Category, NewCategoryInput, UpdateCategoryInput } from "@/lib/types";
import {
  NATURE_OPTIONS,
  COLOR_OPTIONS,
  PLIES_OPTIONS,
  THICKNESS_OPTIONS,
  MOTIF_OPTIONS,
  computeCategoryName,
} from "@/lib/bobine-category-options";

type SortField = "name" | "nature" | "id";

export function CategoriesAdmin() {
  const [items, setItems] = useState<Category[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortField>("id");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        sort,
        order,
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/categories?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load categories");
        return;
      }
      setItems(data.data.items as Category[]);
      setTotal(data.data.total as number);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, sort, order]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  // Debounce search.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchCategories();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(category: Category) {
    setEditing(category);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/categories/${deleting.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to delete category");
        return;
      }
      setDeleting(null);
      fetchCategories();
    } catch {
      alert("Network error. Please try again.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-1 min-w-[200px] items-center gap-2">
          <Input
            placeholder="Search by name, nature, color, motif…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex flex-1 min-w-[200px] items-center justify-end gap-2">
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortField)}
            className="w-40"
          >
            <option value="id">Sort: Created</option>
            <option value="name">Sort: Name</option>
            <option value="nature">Sort: Nature</option>
          </Select>
          <Button
            variant="secondary"
            onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
            className="whitespace-nowrap"
          >
            {order === "asc" ? "↑ Asc" : "↓ Desc"}
          </Button>
          <Button onClick={openCreate} className="whitespace-nowrap">
            <Plus className="h-4 w-4" /> Add category
          </Button>
        </div>
      </div>

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
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Nature</th>
              <th className="px-4 py-3">Color</th>
              <th className="px-4 py-3">Plies</th>
              <th className="px-4 py-3">Thickness</th>
              <th className="px-4 py-3">Motif</th>
              <th className="px-4 py-3">SI Active</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                  No categories found.{" "}
                  <button
                    onClick={openCreate}
                    className="font-medium text-slate-700 underline"
                  >
                    Add a category
                  </button>
                </td>
              </tr>
            ) : (
              items.map((c, i) => (
                <tr key={c.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900">
                    {c.name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{c.nature}</td>
                  <td className="px-4 py-3 text-slate-700">{c.color}</td>
                  <td className="px-4 py-3 text-slate-700">{c.plies}</td>
                  <td className="px-4 py-3 text-slate-700">{c.thickness}</td>
                  <td className="px-4 py-3 text-slate-700">{c.motif}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        c.si_active
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {c.si_active ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(c)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Edit category"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(c)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete category"
                      >
                        <Trash2 className="h-4 w-4" />
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
          {total} categor{total === 1 ? "y" : "ies"} · page {page} of{" "}
          {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            variant="secondary"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {modalOpen && (
        <CategoryModal
          category={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            fetchCategories();
          }}
        />
      )}

      {deleting && (
        <DeleteDialog
          category={deleting}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / Edit modal
// ---------------------------------------------------------------------------

function CategoryModal({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = category != null;
  const [nature, setNature] = useState(category?.nature ?? NATURE_OPTIONS[0].label);
  const [color, setColor] = useState(category?.color ?? COLOR_OPTIONS[0].label);
  const [plies, setPlies] = useState(category?.plies ?? PLIES_OPTIONS[0].label);
  const [thickness, setThickness] = useState(
    category?.thickness ?? THICKNESS_OPTIONS[0].label
  );
  const [motif, setMotif] = useState(category?.motif ?? MOTIF_OPTIONS[0].label);
  const [siActive, setSiActive] = useState(category?.si_active ?? false);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const computedName = useMemo(
    () => computeCategoryName({ nature, color, plies, thickness, motif }),
    [nature, color, plies, thickness, motif]
  );

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!computedName) {
      setErr("Invalid field combination");
      return;
    }
    setSaving(true);
    try {
      if (isEdit && category) {
        const body: UpdateCategoryInput = {
          nature,
          color,
          plies,
          thickness,
          motif,
          si_active: siActive,
        };
        const res = await fetch(`/api/admin/categories/${category.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setErr(data.error || "Failed to update category");
          return;
        }
        onSaved();
      } else {
        const body: NewCategoryInput = { nature, color, plies, thickness, motif, si_active: siActive };
        const res = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setErr(data.error || "Failed to create category");
          return;
        }
        onSaved();
      }
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            {isEdit ? "Edit category" : "Add category"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-5 px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="c-nature">Nature</Label>
              <Select
                id="c-nature"
                value={nature}
                onChange={(e) => setNature(e.target.value)}
              >
                {NATURE_OPTIONS.map((o) => (
                  <option key={o.label} value={o.label}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-color">Color</Label>
              <Select
                id="c-color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              >
                {COLOR_OPTIONS.map((o) => (
                  <option key={o.label} value={o.label}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-plies">Plies</Label>
              <Select
                id="c-plies"
                value={plies}
                onChange={(e) => setPlies(e.target.value)}
              >
                {PLIES_OPTIONS.map((o) => (
                  <option key={o.label} value={o.label}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="c-thickness">Thickness</Label>
              <Select
                id="c-thickness"
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
              >
                {THICKNESS_OPTIONS.map((o) => (
                  <option key={o.label} value={o.label}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="c-motif">Motif</Label>
              <Select
                id="c-motif"
                value={motif}
                onChange={(e) => setMotif(e.target.value)}
              >
                {MOTIF_OPTIONS.map((o) => (
                  <option key={o.label} value={o.label}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>

            {/* SI Active toggle */}
            <div className="flex items-center gap-3 sm:col-span-2">
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  className="peer sr-only"
                  checked={siActive}
                  onChange={(e) => setSiActive(e.target.checked)}
                />
                <div className="h-6 w-11 rounded-full border border-slate-300 bg-slate-100 after:absolute after:start-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-slate-300 after:bg-white after:transition-all peer-checked:border-purple-600 peer-checked:bg-purple-600 peer-checked:after:translate-x-full peer-checked:after:border-white" />
              </label>
              <div>
                <span className="text-sm font-medium text-slate-900">
                  Stock Initial (SI) actif
                </span>
                <p className="text-xs text-slate-500">
                  {siActive
                    ? "Une ligne SI est créée ou activée dans les stocks"
                    : "Aucune ligne SI n'est gérée pour cette catégorie"}
                </p>
              </div>
            </div>
          </div>

          {/* Computed name preview */}
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Computed name
            </p>
            <p className="mt-1 font-mono text-sm font-medium text-slate-900">
              {computedName ?? "—"}
            </p>
          </div>

          {err && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {err}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create category"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Delete confirmation
// ---------------------------------------------------------------------------

function DeleteDialog({
  category,
  onCancel,
  onConfirm,
}: {
  category: Category;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">
          Delete category
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Delete category <strong>{category.name || `#${category.id}`}</strong>?
          This action cannot be undone.
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="danger" onClick={onConfirm}>
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}