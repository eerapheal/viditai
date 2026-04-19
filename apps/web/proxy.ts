import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SECRET_KEY = "change-me-in-production"; // Matches backend Settings.SECRET_KEY

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("auth_token")?.value;

  // 1. Redirect authenticated users away from the landing page to the dashboard
  if (pathname === "/" && token) {
    try {
      const secret = new TextEncoder().encode(SECRET_KEY);
      const { payload } = await jwtVerify(token, secret);
      const userRole = payload.role as string;
      
      if (userRole === "admin" || userRole === "super_admin") {
        return NextResponse.redirect(new URL("/dashboard/admin", request.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard/user", request.url));
      }
    } catch (e) {
      // If token is invalid, just let them see the landing page
      return NextResponse.next();
    }
  }

  // 2. Define Protected Routes
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAdminRoute = pathname.startsWith("/dashboard/admin");
  const isUserRoute = pathname.startsWith("/dashboard/user");

  if (isDashboardRoute) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    try {
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
      console.error("Proxy Auth Error:", error);
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
