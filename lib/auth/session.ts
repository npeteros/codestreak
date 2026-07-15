import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth } from "@/lib/firebase/admin";
import type { UserRole } from "@/lib/firebase/types";
import { getUser } from "@/lib/repositories/users";

export const SESSION_COOKIE_NAME = "codestreak_session";

// Verifies a raw session cookie value, returning the decoded token or null.
// Exposed separately from getUid() because proxy.ts reads the cookie via
// NextRequest.cookies (not next/headers' cookies()) and needs the decoded
// token itself (for the `role` custom claim), not just a uid.
//
// checkRevoked defaults to false: it forces a network round-trip to
// Google's Identity Toolkit on top of the local JWT verification, which
// adds real latency if paid on every request. High-frequency, low-stakes
// call sites (proxy.ts's per-navigation check, getUid()) accept the default
// and skip it; getCurrentUser() — the role gate behind every
// instructor-privileged Server Action and redirect-guarded page — opts in,
// since that's exactly the "was this account's access just revoked" check
// that matters.
export async function verifySessionCookie(
  value: string,
  checkRevoked = false
): Promise<DecodedIdToken | null> {
  try {
    return await adminAuth.verifySessionCookie(value, checkRevoked);
  } catch {
    return null;
  }
}

// Cheapest check: local cookie verification only, no Firestore read and no
// revocation check. Matches call sites that only ever needed the uid (e.g.
// to scope a query to the caller).
export async function getUid(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!value) return null;
  const decoded = await verifySessionCookie(value);
  return decoded?.uid ?? null;
}

export interface CurrentUser {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
}

// uid + profile + role, via a users/{uid} Firestore read, with revocation
// checking enabled (see verifySessionCookie's comment). Returns null if the
// session is missing/invalid/revoked or the user doc doesn't exist.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!value) return null;
  const decoded = await verifySessionCookie(value, true);
  if (!decoded) return null;
  const data = await getUser(decoded.uid);
  if (!data) return null;
  return { uid: decoded.uid, role: data.role, name: data.name, email: data.email };
}

// Non-throwing role gate, for Server Actions that return a {success:false}
// shape rather than redirecting.
export async function requireRole(
  role: UserRole
): Promise<{ uid: string; role: UserRole } | null> {
  const user = await getCurrentUser();
  if (!user || user.role !== role) return null;
  return { uid: user.uid, role: user.role };
}

// Throwing variants for layouts/pages that redirect on failure instead of
// returning an error value.

export async function requireUidOrRedirect(): Promise<string> {
  const uid = await getUid();
  if (!uid) redirect("/login");
  return uid;
}

export async function requireRoleOrRedirect(
  role: UserRole
): Promise<{ uid: string; role: UserRole }> {
  const user = await requireRole(role);
  if (!user) redirect("/login");
  return user;
}
