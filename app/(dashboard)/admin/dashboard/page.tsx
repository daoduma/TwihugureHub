// app/(dashboard)/admin/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Admin Dashboard" };

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);

  // Quick stats
  const [totalUsers, farmers, trainers, mbazaStaff] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: "FARMER" } }),
    db.user.count({ where: { role: "TRAINER" } }),
    db.user.count({ where: { role: "MBAZA_STAFF" } }),
  ]);

  const stats = [
    { label: "Total Users", value: totalUsers, emoji: "👥" },
    { label: "Farmers", value: farmers, emoji: "🌱" },
    { label: "Trainers", value: trainers, emoji: "🎓" },
    { label: "Mbaza Staff", value: mbazaStaff, emoji: "🏢" },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
          Admin Dashboard 🛡️
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome back, {session?.user?.name}. Platform overview below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="card p-5">
            <span className="text-2xl">{stat.emoji}</span>
            <p className="mt-2 text-3xl font-bold text-brand-700">{stat.value}</p>
            <p className="mt-0.5 text-xs text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
