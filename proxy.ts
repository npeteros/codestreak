import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Anonymous visitors fall through untouched so this stays prerenderable.
  if (pathname === "/") {
    if (!sessionCookie) return NextResponse.next();
    const decoded = await verifySessionToken(sessionCookie);
    if (!decoded) return NextResponse.next();
    const role = decoded.role;
    return NextResponse.redirect(
      new URL(
        role === "INSTRUCTOR" ? "/dashboard/instructor" : "/dashboard/student",
        request.url
      )
    );
  }

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const decoded = await verifySessionToken(sessionCookie);
  if (!decoded) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  // JWT payload, not requireRole() — avoids a DB round trip on every navigation.
  const role = decoded.role;

  if (role === "INSTRUCTOR" && pathname.startsWith("/dashboard/student")) {
    return NextResponse.redirect(
      new URL("/dashboard/instructor", request.url)
    );
  }
  if (role === "STUDENT" && pathname.startsWith("/dashboard/instructor")) {
    return NextResponse.redirect(
      new URL("/dashboard/student", request.url)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard/:path*"],
};
