"use client";
// app/(dashboard)/mbaza/groups/page.tsx

import { useState, useEffect } from "react";
import Link from "next/link";

interface Group {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  farmerCount: number;
  avgProgress: number;
  createdBy: { name: string };
  createdAt: string;
}

interface Farmer { id: string; name: string; email: string; }

function GroupModal({
  group,
  allFarmers,
  onClose,
  onSaved,
}: {
  group?: Group;
  allFarmers: Farmer[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: group?.name ?? "", description: group?.description ?? "", region: group?.region ?? "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    setLoading(true); setError("");
    try {
      const url = group ? `/api/mbaza/groups/${group.id}` : "/api/mbaza/groups";
      const method = group ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      onSaved(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : "Error"); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-lg font-bold text-gray-900 mb-4">{group ? "Edit Group" : "Create Group"}</h2>
        {error && <p className="text-sm text-red-600 bg-red-50 rounded p-2 mb-3">{error}</p>}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Group Name *</label>
            <input className="input w-full" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Northern Sector Farmers" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Region</label>
            <input className="input w-full" value={form.region} onChange={e => setForm(p => ({ ...p, region: e.target.value }))} placeholder="e.g. Northern Province" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <textarea className="input w-full h-20 resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Optional notes about this group…" />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={loading || !form.name.trim()} className="btn-primary flex-1">{loading ? "Saving…" : "Save Group"}</button>
        </div>
      </div>
    </div>
  );
}

function ManageMembersModal({ group, onClose }: { group: Group; onClose: () => void }) {
  const [allFarmers, setAllFarmers] = useState<Farmer[]>([]);
  const [currentMembers, setCurrentMembers] = useState<string[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`/api/mbaza/farmers?limit=200`).then(r => r.json()).then(d => {
      setAllFarmers(d.farmers ?? []);
    });
    fetch(`/api/mbaza/groups`).then(r => r.json()).then(d => {
      const g = d.groups?.find((g: { id: string; memberships: Array<{farmerId: string}> }) => g.id === group.id);
      if (g) {
        const ids = g.memberships?.map((m: { farmerId: string }) => m.farmerId) ?? [];
        setCurrentMembers(ids);
        setSelected(new Set(ids));
      }
    });
  }, [group.id]);

  const handleSave = async () => {
    setLoading(true);
    const current = new Set(currentMembers);
    const add = [...selected].filter(id => !current.has(id));
    const remove = currentMembers.filter(id => !selected.has(id));
    await fetch(`/api/mbaza/groups/${group.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ add, remove }),
    });
    setLoading(false);
    onClose();
  };

  const filtered = allFarmers.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.email.toLowerCase().includes(search.toLowerCase())
  );

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl flex flex-col max-h-[80vh]">
        <h2 className="text-lg font-bold text-gray-900 mb-2">Manage Members — {group.name}</h2>
        <p className="text-xs text-gray-400 mb-3">{selected.size} selected</p>
        <input className="input mb-3" placeholder="Search farmers…" value={search} onChange={e => setSearch(e.target.value)} />
        <div className="flex-1 overflow-y-auto space-y-1 border border-gray-100 rounded-xl p-2">
          {filtered.map(f => (
            <label key={f.id} className="flex items-center gap-3 rounded-lg px-3 py-2 hover:bg-gray-50 cursor-pointer">
              <input type="checkbox" checked={selected.has(f.id)} onChange={() => toggle(f.id)} className="accent-brand-600 h-4 w-4" />
              <div>
                <p className="text-sm font-medium text-gray-800">{f.name}</p>
                <p className="text-xs text-gray-400">{f.email}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="btn-primary flex-1">{loading ? "Saving…" : "Save Members"}</button>
        </div>
      </div>
    </div>
  );
}


export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [manageGroup, setManageGroup] = useState<Group | null>(null);

  const fetchGroups = async () => {
    setLoading(true);
    const res = await fetch("/api/mbaza/groups");
    const data = await res.json();
    setGroups(data.groups ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchGroups(); }, []);

  const deleteGroup = async (id: string) => {
    if (!confirm("Delete this group? Farmers will not be deleted.")) return;
    await fetch(`/api/mbaza/groups/${id}`, { method: "DELETE" });
    fetchGroups();
  };

  return (
    <div className="animate-fade-in space-y-5">
      {showCreate && <GroupModal allFarmers={[]} onClose={() => setShowCreate(false)} onSaved={fetchGroups} />}
      {editGroup && <GroupModal group={editGroup} allFarmers={[]} onClose={() => setEditGroup(null)} onSaved={fetchGroups} />}
      {manageGroup && <ManageMembersModal group={manageGroup} onClose={() => { setManageGroup(null); fetchGroups(); }} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>Group Management</h1>
          <p className="text-sm text-gray-500">{groups.length} groups</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">+ Create Group</button>
      </div>

      {loading && <p className="text-sm text-gray-400 py-8 text-center">Loading…</p>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {groups.map(g => (
          <div key={g.id} className="card p-5 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-gray-900">{g.name}</h3>
                {g.region && <p className="text-xs text-gray-400 mt-0.5">📍 {g.region}</p>}
                {g.description && <p className="text-xs text-gray-500 mt-1">{g.description}</p>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditGroup(g)} className="text-xs text-brand-600 hover:underline">Edit</button>
                <span className="text-gray-300">·</span>
                <button onClick={() => deleteGroup(g.id)} className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="text-center">
                <p className="text-xl font-bold text-brand-700">{g.farmerCount}</p>
                <p className="text-xs text-gray-400">Farmers</p>
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-green-600">{g.avgProgress}%</p>
                <p className="text-xs text-gray-400">Avg Progress</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setManageGroup(g)} className="btn-secondary text-xs flex-1">👥 Manage Members</button>
              <Link href={`/mbaza/groups/${g.id}`} className="btn-secondary text-xs flex-1 text-center">View Detail →</Link>
            </div>
          </div>
        ))}
        {!loading && groups.length === 0 && (
          <div className="col-span-3 card p-12 text-center">
            <p className="text-4xl mb-2">👥</p>
            <p className="text-gray-500 font-medium">No groups yet.</p>
            <button onClick={() => setShowCreate(true)} className="btn-primary mt-4">Create First Group</button>
          </div>
        )}
      </div>
    </div>
  );
}
