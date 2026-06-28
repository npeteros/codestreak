import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

const COOKIE_NAME = "codestreak_session";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get(COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
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
  } catch {
    const res = NextResponse.redirect(new URL("/login", request.url));
    res.cookies.delete(COOKIE_NAME);
    return res;
  }
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
