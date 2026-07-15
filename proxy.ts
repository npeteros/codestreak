import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionCookie } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  // Root marketing page: only act on an existing valid session (redirect an
  // already-logged-in visitor to their dashboard). Anonymous visitors fall
  // through untouched so the page stays static/prerenderable — no
  // cookie-verify or Firestore read on the app's highest-traffic route.
  if (pathname === "/") {
    if (!sessionCookie) return NextResponse.next();
    const decoded = await verifySessionCookie(sessionCookie);
    if (!decoded) return NextResponse.next();
    const role = decoded.role as "INSTRUCTOR" | "STUDENT" | undefined;
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

  const decoded = await verifySessionCookie(sessionCookie);
  if (!decoded) {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  // Kept on the JWT custom claim (rather than the Firestore-backed
  // requireRole()) deliberately — this runs on every navigation and a
  // Firestore round-trip here would add latency to every route change.
  const role = decoded.role as "INSTRUCTOR" | "STUDENT" | undefined;

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
