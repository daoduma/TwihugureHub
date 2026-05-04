// app/(auth)/layout.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions, getDashboardForRole } from "@/lib/auth";
import type { Role } from "@/types";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // If already logged in, redirect to their dashboard
  if (session?.user?.role) {
    redirect(getDashboardForRole(session.user.role as Role));
  }

  return (
    <div className="auth-bg min-h-screen">
      {children}
    </div>
  );
}
