import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = "change-me-in-production"; // Matches backend Settings.SECRET_KEY

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;

  // 1. Define Protected Routes
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAdminRoute = pathname.startsWith("/dashboard/admin");
  const isUserRoute = pathname.startsWith("/dashboard/user");

  if (isDashboardRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
      // Small trick: We need to decode the role from the JWT if possible,
      // or just assume the client context will handle the fine-grained checks if we can't verify here.
      // However, for strict separation as requested, we MUST verify role.
      
      // Note: Backend payloads usually have 'sub'. We might need to fetch the user 
      // or include 'role' in the JWT payload on the backend to avoid a DB hit in middleware.
      
      // For now, let's assume we skip deep verification in middleware and do it in Layout
      // OR we decode the JWT if the backend is configured to include the role.
      
      // Decoding the JWT (using 'jose' which works in edge)
      const secret = new TextEncoder().encode(SECRET_KEY);
      const { payload } = await jwtVerify(token, secret);
      
      const userRole = payload.role as string;

      if (isAdminRoute && userRole !== "admin" && userRole !== "super_admin") {
        return NextResponse.redirect(new URL("/dashboard/user", request.url));
      }

      if (isUserRoute && userRole === "admin") {
        // Optional: redirect admins out of user workspace if desired
      }

    } catch (error) {
      console.error("Middleware Auth Error:", error);
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
