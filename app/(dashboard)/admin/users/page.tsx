"use client";
// app/(dashboard)/admin/users/page.tsx

import { useState, useEffect, useCallback } from "react";
import type { Metadata } from "next";

type Role = "FARMER" | "TRAINER" | "ADMIN" | "MBAZA_STAFF";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  preferredLanguage: string;
  isActive: boolean;
  createdAt: string;
}

const ROLE_COLORS: Record<Role, string> = {
  FARMER: "bg-green-100 text-green-700",
  TRAINER: "bg-blue-100 text-blue-700",
  ADMIN: "bg-purple-100 text-purple-700",
  MBAZA_STAFF: "bg-orange-100 text-orange-700",
};

const ROLE_LABELS: Record<Role, string> = {
  FARMER: "Farmer",
  TRAINER: "Trainer",
  ADMIN: "Admin",
  MBAZA_STAFF: "Mbaza Staff",
};

function CreateUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "TRAINER", preferredLanguage: "en" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error ?? "Failed to create user");
      }
      onCreated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Create Staff Account</h2>
        <p className="text-xs text-gray-500 mb-4">Farmers self-register. This form creates Trainer, Admin, or Mbaza Staff accounts.</p>
        <div className="space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
            <input className="input w-full" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Jane Doe" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input className="input w-full" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="jane@example.com" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Temporary Password</label>
            <input className="input w-full" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="Min 8 chars" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select className="input w-full" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="TRAINER">Trainer</option>
              <option value="ADMIN">Admin</option>
              <option value="MBAZA_STAFF">Mbaza Staff</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Language</label>
            <select className="input w-full" value={form.preferredLanguage} onChange={e => setForm(p => ({ ...p, preferredLanguage: e.target.value }))}>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="rw">Ikinyarwanda</option>
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary flex-1">
            {loading ? "Creating…" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

function EditUserModal({ user, onClose, onSaved }: { user: User; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role, preferredLanguage: user.preferredLanguage, newPassword: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setLoading(true);
    setError("");
    try {
      const body: Record<string, string> = { name: form.name, email: form.email, role: form.role, preferredLanguage: form.preferredLanguage };
      if (form.newPassword) body.newPassword = form.newPassword;
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-4">Edit User</h2>
        <div className="space-y-3">
          {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2">{error}</p>}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
            <input className="input w-full" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
            <input className="input w-full" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select className="input w-full" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value as Role }))}>
              <option value="FARMER">Farmer</option>
              <option value="TRAINER">Trainer</option>
              <option value="ADMIN">Admin</option>
              <option value="MBAZA_STAFF">Mbaza Staff</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Language</label>
            <select className="input w-full" value={form.preferredLanguage} onChange={e => setForm(p => ({ ...p, preferredLanguage: e.target.value }))}>
              <option value="en">English</option>
              <option value="fr">Français</option>
              <option value="rw">Ikinyarwanda</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">New Password (leave blank to keep)</label>
            <input className="input w-full" type="password" value={form.newPassword} onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))} placeholder="•••••••••" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">{loading ? "Saving…" : "Save"}</button>
        </div>
      </div>
    </div>
  );
}


// CHANGED: Added page title for browser <title> tags
export const metadata = { title: "Manage Users" };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const limit = 20;

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) params.set("search", search);
    if (roleFilter) params.set("role", roleFilter);
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  }, [page, search, roleFilter, statusFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const toggleStatus = async (user: User) => {
    await fetch(`/api/admin/users/${user.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    fetchUsers();
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="animate-fade-in space-y-5">
      {showCreate && <CreateUserModal onClose={() => setShowCreate(false)} onCreated={fetchUsers} />}
      {editUser && <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSaved={fetchUsers} />}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
            User Management
          </h1>
          <p className="text-sm text-gray-500">{total} users total</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary whitespace-nowrap">+ Create User</button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col gap-3 sm:flex-row">
        <input
          className="input flex-1"
          placeholder="Search by name or email…"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
        />
        <select className="input sm:w-40" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1); }}>
          <option value="">All Roles</option>
          <option value="FARMER">Farmer</option>
          <option value="TRAINER">Trainer</option>
          <option value="ADMIN">Admin</option>
          <option value="MBAZA_STAFF">Mbaza Staff</option>
        </select>
        <select className="input sm:w-40" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Lang</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">Loading…</td></tr>
            )}
            {!loading && users.length === 0 && (
              <tr><td colSpan={7} className="py-8 text-center text-gray-400">No users found</td></tr>
            )}
            {users.map(user => (
              <tr key={user.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-900">{user.name}</td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${ROLE_COLORS[user.role]}`}>
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 uppercase text-xs">{user.preferredLanguage}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${user.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {user.isActive ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">{new Date(user.createdAt).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => setEditUser(user)} className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50">Edit</button>
                    <button onClick={() => toggleStatus(user)} className={`rounded px-2 py-1 text-xs font-medium ${user.isActive ? "text-red-600 hover:bg-red-50" : "text-green-600 hover:bg-green-50"}`}>
                      {user.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50">← Prev</button>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="btn-secondary py-1.5 px-3 text-xs disabled:opacity-50">Next →</button>
          </div>
        </div>
      )}
    </div>
  );
}
