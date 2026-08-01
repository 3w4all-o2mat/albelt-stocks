"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Form";
import type {
  AppVariable,
  NewVariableInput,
  UpdateVariableInput,
  VariableType,
} from "@/lib/types";

const TYPES: VariableType[] = ["integer", "string", "boolean"];

export function VariablesAdmin() {
  const [items, setItems] = useState<AppVariable[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<AppVariable | null>(null);
  const [deleting, setDeleting] = useState<AppVariable | null>(null);

  const fetchVariables = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set("search", search);
      const res = await fetch(`/api/admin/variables?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load variables");
        return;
      }
      setItems(data.data.items as AppVariable[]);
      setTotal(data.data.total as number);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchVariables();
  }, [fetchVariables]);

  // Debounce search.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchVariables();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(variable: AppVariable) {
    setEditing(variable);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/variables/${deleting.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to delete variable");
        return;
      }
      setDeleting(null);
      fetchVariables();
    } catch {
      alert("Network error. Please try again.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-[3] min-w-[200px] items-center gap-2">
          <Input
            placeholder="Search by key or label…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="flex flex-1 min-w-[200px] items-center justify-end gap-2">
          <Button onClick={openCreate} className="w-full whitespace-nowrap">
            <Plus className="h-4 w-4" /> Add variable
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
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Label</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  Loading…
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No variables found.{" "}
                  <button
                    onClick={openCreate}
                    className="font-medium text-slate-700 underline"
                  >
                    Add a variable
                  </button>
                </td>
              </tr>
            ) : (
              items.map((v, i) => (
                <tr key={v.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-slate-900">
                    {v.key}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{v.label}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {v.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{v.value}</td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(v.write_date).toLocaleString("fr-FR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(v)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Edit variable"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(v)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        aria-label="Delete variable"
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
          {total} variable{total === 1 ? "" : "s"} · page {page} of{" "}
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
        <VariableModal
          variable={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            fetchVariables();
          }}
        />
      )}

      {deleting && (
        <DeleteDialog
          variable={deleting}
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

function VariableModal({
  variable,
  onClose,
  onSaved,
}: {
  variable: AppVariable | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = variable != null;
  const [key, setKey] = useState(variable?.key ?? "");
  const [label, setLabel] = useState(variable?.label ?? "");
  const [type, setType] = useState<VariableType>(variable?.type ?? "integer");
  const [value, setValue] = useState(variable?.value ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      if (isEdit && variable) {
        const body: UpdateVariableInput = {
          label: label.trim(),
          type,
          value: value.trim(),
        };
        const res = await fetch(`/api/admin/variables/${variable.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setErr(data.error || "Failed to update variable");
          return;
        }
        onSaved();
      } else {
        const body: NewVariableInput = {
          key: key.trim(),
          label: label.trim(),
          type,
          value: value.trim(),
        };
        const res = await fetch("/api/admin/variables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setErr(data.error || "Failed to create variable");
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
      <div className="w-full max-w-lg rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            {isEdit ? "Edit variable" : "Add variable"}
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
          <div className="space-y-1.5">
            <Label htmlFor="v-key">Key</Label>
            <Input
              id="v-key"
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase())}
              disabled={isEdit}
              required
              placeholder="VARIABLE_NAME"
            />
            {isEdit && (
              <p className="text-xs text-slate-400">Immutable once created.</p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="v-label">Label</Label>
            <Input
              id="v-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="v-type">Type</Label>
              <Select
                id="v-type"
                value={type}
                onChange={(e) => setType(e.target.value as VariableType)}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="v-value">Value</Label>
              <Input
                id="v-value"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                placeholder={type === "integer" ? "12" : type === "boolean" ? "true" : ""}
              />
            </div>
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
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create variable"}
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
  variable,
  onCancel,
  onConfirm,
}: {
  variable: AppVariable;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">
          Delete variable
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Delete variable <strong>{variable.key}</strong>? This action cannot be
          undone.
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