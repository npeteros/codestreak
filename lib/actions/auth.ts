"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { UserRole } from "@/lib/firebase/types";

const COOKIE_NAME = "codestreak_session";

export async function signUp(
  email: string,
  password: string,
  name: string,
  role: UserRole
) {
  try {
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: name,
    });

    await adminAuth.setCustomUserClaims(userRecord.uid, { role });

    await adminDb.collection("users").doc(userRecord.uid).set({
      uid: userRecord.uid,
      email,
      name,
      role,
      createdAt: FieldValue.serverTimestamp(),
    });

    const customToken = await adminAuth.createCustomToken(userRecord.uid, {
      role,
    });

    return { success: true as const, customToken, role };
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? "";
    const messages: Record<string, string> = {
      "auth/email-already-in-use": "An account with this email already exists.",
      "auth/email-already-exists": "An account with this email already exists.",
      "auth/weak-password": "Password must be at least 8 characters.",
      "auth/invalid-email": "Please enter a valid email address.",
    };
    console.error("Error during sign up:", err);
    return {
      success: false as const,
      error: messages[code] ?? "Something went wrong. Please try again.",
    };
  }
}

export async function logIn(email: string, password: string) {
  // Login is handled entirely client-side via Firebase client SDK.
  void email;
  void password;
  return { success: false as const, error: "not implemented" };
}

export async function logOut() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/login");
}
