// app/page.tsx
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDashboardForRole } from "@/lib/auth";
import type { Role } from "@/types";

export default async function RootPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role) {
    redirect(getDashboardForRole(session.user.role as Role));
  }

  redirect("/login");
}
