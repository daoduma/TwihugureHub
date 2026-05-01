// app/(dashboard)/trainer/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Trainer Dashboard" };

export default async function TrainerDashboard() {
  const session = await getServerSession(authOptions);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
          Welcome, {session?.user?.name} 🎓
        </h1>
        <p className="mt-1 text-sm text-gray-500">Trainer Dashboard — course management coming soon.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["My Courses", "Enrolled Farmers", "Analytics"].map((label) => (
          <div key={label} className="card p-6">
            <div className="mb-3 h-10 w-10 rounded-xl bg-brand-100 flex items-center justify-center">
              <span className="text-lg">📊</span>
            </div>
            <h3 className="font-semibold text-gray-800">{label}</h3>
            <p className="mt-1 text-sm text-gray-400">Coming soon</p>
          </div>
        ))}
      </div>
    </div>
  );
}
