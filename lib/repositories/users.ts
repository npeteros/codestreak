import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { UserDoc, UserRole } from "@/lib/firebase/types";

export async function getUser(uid: string): Promise<UserDoc | null> {
  const snap = await adminDb.collection("users").doc(uid).get();
  return snap.exists ? (snap.data() as UserDoc) : null;
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
