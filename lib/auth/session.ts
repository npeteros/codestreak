import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { UserRole } from "@/lib/types";
import { getUser } from "@/lib/repositories/users";

export const SESSION_COOKIE_NAME = "codestreak_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 5; // 5 days

function getSecretKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SESSION_SECRET must be set to a random string of at least 32 characters."
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  uid: string;
  role: UserRole;
}

// Local signature+expiry check only, no DB read. Exposed separately from
// getUid() because proxy.ts reads the cookie via NextRequest.cookies and
// needs the decoded `role` claim itself, not just a uid.
export async function verifySessionToken(
  value: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(value, getSecretKey());
    if (typeof payload.uid !== "string" || typeof payload.role !== "string") {
      return null;
    }
    return { uid: payload.uid, role: payload.role as UserRole };
  } catch {
    return null;
  }
}

// Split out from issueSessionCookie so it's testable without a request context.
export async function signSessionToken(uid: string, role: UserRole): Promise<string> {
  return new SignJWT({ uid, role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(getSecretKey());
}

// Called only from lib/actions/auth.ts — see AGENTS.md's layering rule.
export async function issueSessionCookie(
  uid: string,
  role: UserRole
): Promise<void> {
  const token = await signSessionToken(uid, role);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION_SECONDS,
    path: "/",
  });
}

// Cheapest check: local verification only, no DB read.
export async function getUid(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!value) return null;
  const payload = await verifySessionToken(value);
  return payload?.uid ?? null;
}

export interface CurrentUser {
  uid: string;
  role: UserRole;
  name: string;
  email: string;
}

// Authoritative check — also excludes soft-deleted accounts via getUser.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!value) return null;
  const payload = await verifySessionToken(value);
  if (!payload) return null;
  const data = await getUser(payload.uid);
  if (!data) return null;
  return { uid: payload.uid, role: data.role, name: data.name, email: data.email };
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
