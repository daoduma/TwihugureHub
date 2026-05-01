// app/(dashboard)/mbaza/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Mbaza Staff Dashboard" };

export default async function MbazaDashboard() {
  const session = await getServerSession(authOptions);

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-900" style={{ fontFamily: "var(--font-display)" }}>
          Mbaza Services Dashboard 🏢
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome, {session?.user?.name}. Mbaza knowledge base and support tools coming soon.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {["Knowledge Base", "Support Tickets", "Analytics"].map((label) => (
          <div key={label} className="card p-6">
            <div className="mb-3 h-10 w-10 rounded-xl bg-earth-100 flex items-center justify-center">
              <span className="text-lg">📋</span>
            </div>
            <h3 className="font-semibold text-gray-800">{label}</h3>
            <p className="mt-1 text-sm text-gray-400">Coming soon</p>
          </div>
        ))}
      </div>
    </div>
  );
}
