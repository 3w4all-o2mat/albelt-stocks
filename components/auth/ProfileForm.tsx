"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Form";
import { RoleBadge } from "@/components/ui/RoleBadge";
import type { MembershipUser } from "@/lib/types";

export function ProfileForm({ user }: { user: MembershipUser }) {
  const [fullName, setFullName] = useState(user.full_name ?? "");
  const [email, setEmail] = useState(user.email);

  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileErr(null);
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: fullName.trim() || null,
          email: email.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setProfileErr(data.error || "Failed to update profile");
        return;
      }
      setProfileMsg("Profile updated.");
    } catch {
      setProfileErr("Network error. Please try again.");
    } finally {
      setSavingProfile(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwErr(null);
    setPwMsg(null);
    setSavingPw(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setPwErr(data.error || "Failed to change password");
        return;
      }
      setPwMsg("Password changed.");
      setCurrentPassword("");
      setNewPassword("");
    } catch {
      setPwErr("Network error. Please try again.");
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Read-only identity */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">Account</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-slate-500">Username</dt>
            <dd className="font-medium text-slate-900">{user.username}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Role</dt>
            <dd className="mt-0.5">
              <RoleBadge role={user.role} />
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Odoo username</dt>
            <dd className="font-medium text-slate-900">
              {user.odoo_username || "—"}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Member since</dt>
            <dd className="font-medium text-slate-900">
              {new Date(user.date_creation).toLocaleDateString("fr-FR")}
            </dd>
          </div>
        </dl>
      </section>

      {/* Editable profile */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900">
          Edit profile
        </h2>
        <form onSubmit={saveProfile} className="mt-4 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input
              id="full_name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {profileErr && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {profileErr}
            </p>
          )}
          {profileMsg && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {profileMsg}
            </p>
          )}
          <Button type="submit" disabled={savingProfile}>
            {savingProfile ? "Saving…" : "Save profile"}
          </Button>
        </form>
      </section>

      {/* Password change */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm md:col-span-2">
        <h2 className="text-base font-semibold text-slate-900">
          Change password
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter your current password to set a new one. Minimum 8 characters
          with at least one number and one special character.
        </p>
        <form onSubmit={changePassword} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="current_password">Current password</Label>
            <Input
              id="current_password"
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new_password">New password</Label>
            <Input
              id="new_password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </div>
          {pwErr && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 sm:col-span-2">
              {pwErr}
            </p>
          )}
          {pwMsg && (
            <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 sm:col-span-2">
              {pwMsg}
            </p>
          )}
          <div className="sm:col-span-2">
            <Button type="submit" disabled={savingPw}>
              {savingPw ? "Changing…" : "Change password"}
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}
