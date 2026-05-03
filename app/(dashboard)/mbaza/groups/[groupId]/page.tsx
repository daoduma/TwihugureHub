"use client";
// app/(dashboard)/mbaza/groups/[groupId]/page.tsx

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

interface Member {
  id: string; name: string; email: string;
  enrollments: Array<{ progressPercent: number; completedAt: string | null }>;
}

interface GroupDetail {
  id: string; name: string; description: string | null; region: string | null;
  farmerCount: number; avgProgress: number;
  memberships: Array<{ farmer: Member }>;
}

export default function GroupDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/mbaza/groups").then(r => r.json()).then(d => {
      const g = (d.groups as GroupDetail[]).find(g => g.id === groupId);
      setGroup(g ?? null);
      setLoading(false);
    });
  }, [groupId]);

  if (loading) return <div className="flex items-center justify-center h-64 text-gray-400">Loading…</div>;
  if (!group) return <div className="p-8 text-red-500">Group not found.</div>;

  return (
    <div className="animate-fade-in space-y-5 max-w-3xl">
      <Link href="/mbaza/groups" className="text-sm text-brand-600 hover:underline">← Back to Groups</Link>

      <div className="card p-6">
        <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
        {group.region && <p className="text-sm text-gray-500 mt-0.5">📍 {group.region}</p>}
        {group.description && <p className="text-sm text-gray-600 mt-2">{group.description}</p>}
        <div className="flex gap-6 mt-4">
          <div><p className="text-2xl font-bold text-brand-700">{group.farmerCount}</p><p className="text-xs text-gray-400">Farmers</p></div>
          <div><p className="text-2xl font-bold text-green-600">{group.avgProgress}%</p><p className="text-xs text-gray-400">Avg Progress</p></div>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {["Farmer", "Enrolled Courses", "Avg Progress", "Completed", ""].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.memberships.map(({ farmer: f }) => {
              const avgProg = f.enrollments.length
                ? Math.round(f.enrollments.reduce((s, e) => s + e.progressPercent, 0) / f.enrollments.length)
                : 0;
              const completed = f.enrollments.filter(e => e.completedAt).length;
              return (
                <tr key={f.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{f.name}</p>
                    <p className="text-xs text-gray-400">{f.email}</p>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{f.enrollments.length}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-gray-100">
                        <div className="h-1.5 rounded-full bg-brand-500" style={{ width: `${avgProg}%` }} />
                      </div>
                      <span className="text-xs">{avgProg}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-600">{completed} / {f.enrollments.length}</td>
                  <td className="px-4 py-3">
                    <Link href={`/mbaza/farmers/${f.id}`} className="text-xs font-medium text-brand-600 hover:underline">View →</Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
