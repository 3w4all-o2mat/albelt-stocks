"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input, Label, Select } from "@/components/ui/Form";
import { RoleBadge } from "@/components/ui/RoleBadge";
import type {
  Atelier,
  MembershipRole,
  MembershipUser,
  NewUserInput,
  UpdateUserInput,
} from "@/lib/types";
import { ROLE_LABELS } from "@/lib/types";

const ROLES: MembershipRole[] = ["master", "manager", "user"];

export function UsersAdmin({ currentUserId }: { currentUserId: number }) {
  const [items, setItems] = useState<MembershipUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<MembershipRole | "">("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MembershipUser | null>(null);
  const [deleting, setDeleting] = useState<MembershipUser | null>(null);
  const [ateliers, setAteliers] = useState<Atelier[]>([]);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      const res = await fetch(`/api/admin/users?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error || "Failed to load users");
        return;
      }
      setItems(data.data.items as MembershipUser[]);
      setTotal(data.data.total as number);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Load all ateliers once for the assignment checkboxes.
  useEffect(() => {
    async function loadAteliers() {
      try {
        const res = await fetch("/api/admin/ateliers?pageSize=100", {
          cache: "no-store",
        });
        const data = await res.json();
        if (res.ok && data.success) {
          setAteliers(data.data.items as Atelier[]);
        }
      } catch {
        // Non-fatal: atelier section will be empty.
      }
    }
    loadAteliers();
  }, []);

  // Debounce search.
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      fetchUsers();
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(user: MembershipUser) {
    setEditing(user);
    setModalOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/users/${deleting.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || "Failed to delete user");
        return;
      }
      setDeleting(null);
      fetchUsers();
    } catch {
      alert("Network error. Please try again.");
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* First half: search */}
        <div className="flex flex-1 min-w-[200px] items-center gap-2">
          <Input
            placeholder="Search by username or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
          />
        </div>
        {/* Second half: role filter */}
        <div className="flex flex-1 min-w-[200px] items-center justify-end gap-2">
          <Select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value as MembershipRole | "");
              setPage(1);
            }}
            className="w-40"
          >
            <option value="">All roles</option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </Select>

          <Button onClick={openCreate} className="whitespace-nowrap">
            <Plus className="h-4 w-4" /> Add user
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
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Full name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Odoo</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
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
                  No users found.{" "}
                  <button
                    onClick={openCreate}
                    className="font-medium text-slate-700 underline"
                  >
                    Add a user
                  </button>
                </td>
              </tr>
            ) : (
              items.map((u, i) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-500">
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {u.username}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {u.full_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{u.email}</td>
                  <td className="px-4 py-3 text-slate-700">
                    {u.odoo_username || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={u.role} />
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Disabled
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(u.date_creation).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                        aria-label="Edit user"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleting(u)}
                        disabled={u.id === currentUserId}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Delete user"
                        title={
                          u.id === currentUserId
                            ? "You cannot delete your own account"
                            : "Delete user"
                        }
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
          {total} user{total === 1 ? "" : "s"} · page {page} of {totalPages}
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
        <UserModal
          user={editing}
          currentUserId={currentUserId}
          ateliers={ateliers}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setModalOpen(false);
            fetchUsers();
          }}
        />
      )}

      {deleting && (
        <DeleteDialog
          user={deleting}
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

function UserModal({
  user,
  currentUserId,
  ateliers,
  onClose,
  onSaved,
}: {
  user: MembershipUser | null;
  currentUserId: number;
  ateliers: Atelier[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = user != null;
  const [username, setUsername] = useState(user?.username ?? "");
  const [fullName, setFullName] = useState(user?.full_name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [odooUsername, setOdooUsername] = useState(user?.odoo_username ?? "");
  const [role, setRole] = useState<MembershipRole>(user?.role ?? "user");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isActive, setIsActive] = useState(user?.is_active ?? true);
  const [selectedAtelierIds, setSelectedAtelierIds] = useState<number[]>(
    user?.atelier_ids ?? []
  );
  const [atelierId, setAtelierId] = useState<number | null>(
    user?.atelier_id ?? null
  );
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Ensure the default atelier always belongs to the selected set.
  useEffect(() => {
    if (atelierId != null && !selectedAtelierIds.includes(atelierId)) {
      setAtelierId(null);
    }
  }, [selectedAtelierIds, atelierId]);

  function toggleAtelier(id: number) {
    setSelectedAtelierIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);

    if (atelierId != null && !selectedAtelierIds.includes(atelierId)) {
      setErr("Default atelier must be one of the selected ateliers");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && user) {
        const body: UpdateUserInput = {
          full_name: fullName.trim() || null,
          email: email.trim(),
          odoo_username: odooUsername.trim() || null,
          role,
          is_active: isActive,
          atelier_id: atelierId,
          atelier_ids: selectedAtelierIds,
        };
        if (password) body.password = password;
        const res = await fetch(`/api/admin/users/${user.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setErr(data.error || "Failed to update user");
          return;
        }
        onSaved();
      } else {
        const body: NewUserInput & { confirm_password: string } = {
          username: username.trim(),
          full_name: fullName.trim() || null,
          email: email.trim(),
          odoo_username: odooUsername.trim() || null,
          role,
          password,
          confirm_password: confirm,
          atelier_id: atelierId,
          atelier_ids: selectedAtelierIds,
        };
        const res = await fetch("/api/admin/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setErr(data.error || "Failed to create user");
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
            {isEdit ? `Edit ${user?.username}` : "Add user"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="max-h-[70vh] space-y-6 overflow-y-auto px-5 py-4">
          {/* Identity */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Identity
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="m-username">Username</Label>
                <Input
                  id="m-username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isEdit}
                  required
                />
                {isEdit && (
                  <p className="text-xs text-slate-400">
                    Immutable once created.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-fullname">Full name</Label>
                <Input
                  id="m-fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-email">Email</Label>
                <Input
                  id="m-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="m-odoo">Odoo username</Label>
                <Input
                  id="m-odoo"
                  value={odooUsername}
                  onChange={(e) => setOdooUsername(e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* Access & status */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Access & status
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="m-role">Role</Label>
                <Select
                  id="m-role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as MembershipRole)}
                  disabled={isEdit && user?.id === currentUserId}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </Select>
                {isEdit && user?.id === currentUserId && (
                  <p className="text-xs text-slate-400">
                    You cannot change your own role.
                  </p>
                )}
              </div>
              {isEdit && (
                <div className="space-y-1.5">
                  <Label htmlFor="m-active">Status</Label>
                  <Select
                    id="m-active"
                    value={isActive ? "active" : "disabled"}
                    onChange={(e) => setIsActive(e.target.value === "active")}
                    disabled={user?.id === currentUserId}
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </Select>
                </div>
              )}
            </div>
          </section>

          {/* Ateliers */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Ateliers
            </h4>
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
              {role === "master" && (
                <p className="mb-2 text-xs text-slate-500">
                  Masters have access to all ateliers. Assignments below only
                  apply to manager and user roles.
                </p>
              )}
              {ateliers.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No ateliers available. Create ateliers first.
                </p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {ateliers.map((a) => (
                    <label
                      key={a.id}
                      className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm text-slate-700 shadow-sm"
                    >
                      <input
                        type="checkbox"
                        checked={selectedAtelierIds.includes(a.id)}
                        onChange={() => toggleAtelier(a.id)}
                        className="h-4 w-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="flex-1">{a.name}</span>
                      {!a.is_active && (
                        <span className="text-xs text-slate-400">(inactive)</span>
                      )}
                    </label>
                  ))}
                </div>
              )}
              <div className="mt-3 space-y-1.5">
                <Label htmlFor="m-atelier-id">Default atelier</Label>
                <Select
                  id="m-atelier-id"
                  value={atelierId ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setAtelierId(value ? Number(value) : null);
                  }}
                  disabled={selectedAtelierIds.length === 0}
                >
                  <option value="">
                    {selectedAtelierIds.length === 0
                      ? "Select ateliers above"
                      : "— No default atelier —"}
                  </option>
                  {ateliers
                    .filter((a) => selectedAtelierIds.includes(a.id))
                    .map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                        {!a.is_active ? " (inactive)" : ""}
                      </option>
                    ))}
                </Select>
                <p className="text-xs text-slate-500">
                  The default atelier must be one of the selected ateliers.
                </p>
              </div>
            </div>
          </section>

          {/* Security */}
          <section className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Security
            </h4>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="m-password">
                  {isEdit ? "New password (leave blank to keep)" : "Password"}
                </Label>
                <Input
                  id="m-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!isEdit}
                  autoComplete="new-password"
                />
                <p className="text-xs text-slate-400">
                  Min 8 chars, one number and one special character.
                </p>
              </div>
              {!isEdit && (
                <div className="space-y-1.5">
                  <Label htmlFor="m-confirm">Confirm password</Label>
                  <Input
                    id="m-confirm"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                </div>
              )}
            </div>
          </section>

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
              {saving ? "Saving…" : isEdit ? "Save changes" : "Create user"}
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
  user,
  onCancel,
  onConfirm,
}: {
  user: MembershipUser;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-base font-semibold text-slate-900">
          Delete user
        </h3>
        <p className="mt-2 text-sm text-slate-600">
          Delete user <strong>{user.username}</strong>? This action cannot be
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
