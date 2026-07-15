import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { UserDoc, UserRole } from "@/lib/firebase/types";

export async function getUser(uid: string): Promise<UserDoc | null> {
  const snap = await adminDb.collection("users").doc(uid).get();
  return snap.exists ? (snap.data() as UserDoc) : null;
}

// Batched read across many uids (one round trip via adminDb.getAll instead
// of N single-doc reads) — for fan-out views like a class roster.
export async function getUsers(uids: string[]): Promise<Map<string, UserDoc>> {
  const result = new Map<string, UserDoc>();
  if (uids.length === 0) return result;

  const refs = uids.map((uid) => adminDb.collection("users").doc(uid));
  const snaps = await adminDb.getAll(...refs);
  for (const snap of snaps) {
    if (snap.exists) result.set(snap.id, snap.data() as UserDoc);
  }
  return result;
}

export async function createUser(
  uid: string,
  data: { email: string; name: string; role: UserRole }
): Promise<void> {
  await adminDb
    .collection("users")
    .doc(uid)
    .set({
      uid,
      email: data.email,
      name: data.name,
      role: data.role,
      createdAt: FieldValue.serverTimestamp(),
    });
}
