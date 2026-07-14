import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { DecodedIdToken } from "firebase-admin/auth";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { UserDoc, UserRole } from "@/lib/firebase/types";

export const SESSION_COOKIE_NAME = "codestreak_session";

// Verifies a raw session cookie value, returning the decoded token or null.
// Exposed separately from getUid() because proxy.ts reads the cookie via
// NextRequest.cookies (not next/headers' cookies()) and needs the decoded
// token itself (for the `role` custom claim), not just a uid.
export async function verifySessionCookie(
  value: string
): Promise<DecodedIdToken | null> {
  try {
    return await adminAuth.verifySessionCookie(value, true);
  } catch {
    return null;
  }
}

// Cheapest check: cookie verification only, no Firestore read. Matches call
// sites that only ever needed the uid (e.g. to scope a query to the caller).
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

// uid + profile + role, via a users/{uid} Firestore read. Returns null if
// the session is missing/invalid or the user doc doesn't exist.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const uid = await getUid();
  if (!uid) return null;
  const snap = await adminDb.collection("users").doc(uid).get();
  if (!snap.exists) return null;
  const data = snap.data() as UserDoc;
  return { uid, role: data.role, name: data.name, email: data.email };
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
