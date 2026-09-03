"use server";

import { randomUUID } from "crypto";
import argon2 from "argon2";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { UserRole } from "@/lib/types";
import { SESSION_COOKIE_NAME as COOKIE_NAME, issueSessionCookie } from "@/lib/auth/session";
import { createUser, getUserByEmail } from "@/lib/repositories/users";

export async function signUp(
  email: string,
  password: string,
  name: string,
  role: UserRole
) {
  try {
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id });
    const uid = randomUUID();

    await createUser(uid, { email, name, role, passwordHash });
    await issueSessionCookie(uid, role);

    return { success: true as const, role };
  } catch (err: unknown) {
    const code = (err as { parent?: { code?: string } }).parent?.code ?? "";
    if (code === "ER_DUP_ENTRY") {
      return { success: false as const, error: "An account with this email already exists." };
    }
    console.error("Error during sign up:", err);
    return { success: false as const, error: "Something went wrong. Please try again." };
  }
}

export async function logIn(email: string, password: string) {
  const user = await getUserByEmail(email);
  if (!user) {
    return { success: false as const, error: "Invalid email or password." };
  }

  const valid = await argon2.verify(user.passwordHash, password);
  if (!valid) {
    return { success: false as const, error: "Invalid email or password." };
  }

  await issueSessionCookie(user.uid, user.role);
  return { success: true as const, role: user.role };
}

export async function logOut() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
  redirect("/login");
}
