// middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { JWT } from "next-auth/jwt";
import type { Role } from "@/types";

/**
 * Route-to-role access map.
 * Each key is a route prefix; value is an array of roles that may access it.
 */
const ROUTE_ROLE_MAP: Record<string, Role[]> = {
  "/farmer":  ["FARMER"],
  "/trainer": ["TRAINER"],
  "/admin":   ["ADMIN"],
  "/mbaza":   ["MBAZA_STAFF"],
};

/**
 * Resolve which dashboard a role should be redirected to.
 */
function getDashboard(role: Role): string {
  const map: Record<Role, string> = {
    FARMER:      "/farmer/dashboard",
    TRAINER:     "/trainer/dashboard",
    ADMIN:       "/admin/dashboard",
    MBAZA_STAFF: "/mbaza/dashboard",
  };
  return map[role] ?? "/";
}

export default withAuth(
  function middleware(req: NextRequest & { nextauth: { token: JWT | null } }) {
    const { pathname } = req.nextUrl;
    const token = req.nextauth.token;

    if (!token) {
      // Not authenticated — redirect to login with callbackUrl
      const loginUrl = new URL("/login", req.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    const userRole = token.role as Role;

    // Check every protected route prefix
    for (const [prefix, allowedRoles] of Object.entries(ROUTE_ROLE_MAP)) {
      if (pathname.startsWith(prefix)) {
        if (!allowedRoles.includes(userRole)) {
          // Wrong role — send to their own dashboard
          const dashboard = getDashboard(userRole);
          return NextResponse.redirect(new URL(dashboard, req.url));
        }
        break; // Matched prefix, access granted
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // Return true to run middleware, false to redirect to signIn automatically
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
    "/farmer/:path*",
    "/trainer/:path*",
    "/admin/:path*",
    "/mbaza/:path*",
  ],
};
