"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Form";
import type {
  Supplier,
  NewSupplierInput,
  UpdateSupplierInput,
  Country,
} from "@/lib/types";

type SortField = "name" | "date_creation";

export function SuppliersAdmin() {
  const [items, setItems] = useState<Supplier[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "true" | "false">("");
  const [sort, setSort] = useState<SortField>("date_creation");
  const [order, setOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [deleting, setDeleting] = useState<Supplier | null>(null);

  const fetchSuppliers = useCallback(async () => {
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
      if (activeFilter) params.set("active", activeFilter);
      const res = await fetch(`/api/admin/suppliers?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load suppliers");
        return;
      }
      setItems(data.data.items as Supplier[]);
      setTotal(data.data.total as number);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, activeFilter, sort, order]);

  useEffect(() => {
    fetchSuppliers();
  }, [fetchSuppliers]);

  // Debounce search.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchSuppliers();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(supplier: Supplier) {
    setEditing(supplier);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/suppliers/${deleting.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to delete supplier");
        return;
      }
      setDeleting(null);
      fetchSuppliers();
    } catch {
      alert("Network error. Please try again.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + Filters + Create bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search suppliers…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <select
          value={activeFilter}
          onChange={(e) => {
            setActiveFilter(e.target.value as "" | "true" | "false");
            setPage(1);
          }}
          className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-700"
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nouveau fournisseur
        </Button>
      </div>

      {/* Sort + Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span>Sort by:</span>
          <button
            onClick={() => {
              setSort("date_creation");
              setOrder(order === "desc" ? "asc" : "desc");
            }}
            className={`underline ${sort === "date_creation" ? "font-semibold text-slate-900" : ""}`}
          >
            Date{sort === "date_creation" ? (order === "desc" ? " ↓" : " ↑") : ""}
          </button>
          <button
            onClick={() => {
              setSort("name");
              setOrder(order === "desc" ? "asc" : "desc");
            }}
            className={`underline ${sort === "name" ? "font-semibold text-slate-900" : ""}`}
          >
            Name{sort === "name" ? (order === "desc" ? " ↓" : " ↑") : ""}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span>
            Page {page} of {totalPages} ({total} total)
          </span>
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
          >
            ←
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="rounded px-2 py-1 hover:bg-slate-100 disabled:opacity-40"
          >
            →
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-cp/10 px-3 py-2 text-sm text-cp">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Country</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {search
                    ? "No suppliers match your search."
                    : "No suppliers yet."}
                </td>
              </tr>
            )}
            {items.map((s) => (
              <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {s.name}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {s.country_name ?? s.country_code}
                </td>
                <td className="px-4 py-3">
                  {s.is_active ? (
                    <span className="inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      Active
                    </span>
                  ) : (
                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                      Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {new Date(s.date_creation).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(s)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(s)}
                      className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-cp"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {modalOpen && (
        <SupplierModal
          editing={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditing(null);
            fetchSuppliers();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Delete supplier
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to delete{" "}
              <strong>{deleting.name}</strong>? This action cannot be undone.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button onClick={handleDelete}>Delete</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Create / Edit modal
// ---------------------------------------------------------------------------

function SupplierModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(editing?.name ?? "");
  const [countryCode, setCountryCode] = useState(editing?.country_code ?? "");
  const [isActive, setIsActive] = useState(editing?.is_active ?? true);
  const [countries, setCountries] = useState<Country[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = editing != null;

  // Load countries for the dropdown
  useEffect(() => {
    fetch("/api/admin/countries", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setCountries(data.data as Country[]);
      })
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const url = isEdit
        ? `/api/admin/suppliers/${editing.id}`
        : "/api/admin/suppliers";
      const method = isEdit ? "PUT" : "POST";
      const body: NewSupplierInput | UpdateSupplierInput = {
        name: name.trim(),
        country_code: countryCode,
        is_active: isActive,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to save supplier");
        return;
      }
      onSaved();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900">
            {isEdit ? "Modifier le fournisseur" : "Nouveau fournisseur"}
          </h3>
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
              placeholder="e.g. Fournitures Industrielles SARL"
            />
          </div>

          <div>
            <Label>Country</Label>
            <Select
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              required
            >
              <option value="">— Select —</option>
              {countries.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.name_fr} ({c.code})
                </option>
              ))}
            </Select>
          </div>

          <div>
            <Label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="rounded border-slate-300"
              />
              Active
            </Label>
          </div>

          {error && (
            <div className="rounded-md bg-cp/10 px-3 py-2 text-sm text-cp">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : isEdit ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
