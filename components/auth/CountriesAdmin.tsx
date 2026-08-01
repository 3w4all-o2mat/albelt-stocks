"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Form";
import type { Country, NewCountryInput, UpdateCountryInput } from "@/lib/types";

export function CountriesAdmin() {
  const [items, setItems] = useState<Country[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Country | null>(null);
  const [deleting, setDeleting] = useState<Country | null>(null);

  const fetchCountries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/countries`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load countries");
        return;
      }
      setItems(data.data as Country[]);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCountries();
  }, [fetchCountries]);

  const filtered = search.trim()
    ? items.filter(
        (c) =>
          c.code.toLowerCase().includes(search.toLowerCase()) ||
          c.name_fr.toLowerCase().includes(search.toLowerCase()) ||
          c.name_en.toLowerCase().includes(search.toLowerCase())
      )
    : items;

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(country: Country) {
    setEditing(country);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/countries/${deleting.code}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to delete country");
        return;
      }
      setDeleting(null);
      fetchCountries();
    } catch {
      alert("Network error. Please try again.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Search + Create bar */}
      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search countries…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1"
        />
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4" /> Nouveau pays
        </Button>
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
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Nom (FR)</th>
              <th className="px-4 py-3">Name (EN)</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 bg-white">
            {loading && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                  {search ? "No countries match your search." : "No countries yet."}
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.code} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-medium uppercase">
                  {c.code}
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {c.name_fr}
                </td>
                <td className="px-4 py-3 text-slate-600">{c.name_en}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => openEdit(c)}
                      className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      title="Edit"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setDeleting(c)}
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
        <CountryModal
          editing={editing}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onSaved={() => {
            setModalOpen(false);
            setEditing(null);
            fetchCountries();
          }}
        />
      )}

      {/* Delete Confirmation */}
      {deleting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">
              Delete country
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Are you sure you want to delete{" "}
              <strong>{deleting.name_fr}</strong> (<code>{deleting.code}</code>)?
              This action cannot be undone.
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

function CountryModal({
  editing,
  onClose,
  onSaved,
}: {
  editing: Country | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [code, setCode] = useState(editing?.code ?? "");
  const [name_fr, setName_fr] = useState(editing?.name_fr ?? "");
  const [name_en, setName_en] = useState(editing?.name_en ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEdit = editing != null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const url = isEdit
        ? `/api/admin/countries/${editing.code}`
        : "/api/admin/countries";
      const method = isEdit ? "PUT" : "POST";
      const body: NewCountryInput | UpdateCountryInput = isEdit
        ? { name_fr: name_fr.trim(), name_en: name_en.trim() }
        : { code: code.trim().toUpperCase(), name_fr: name_fr.trim(), name_en: name_en.trim() };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to save country");
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
            {isEdit ? "Modifier le pays" : "Nouveau pays"}
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
            <Label>Code</Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              maxLength={3}
              disabled={isEdit}
              placeholder="e.g. FR"
              className="font-mono uppercase"
            />
            <p className="mt-1 text-xs text-slate-400">
              ISO 3166-1 alpha-3 or alpha-2 code
            </p>
          </div>

          <div>
            <Label>Nom (FR)</Label>
            <Input
              value={name_fr}
              onChange={(e) => setName_fr(e.target.value)}
              required
              placeholder="e.g. France"
            />
          </div>

          <div>
            <Label>Name (EN)</Label>
            <Input
              value={name_en}
              onChange={(e) => setName_en(e.target.value)}
              required
              placeholder="e.g. France"
            />
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
