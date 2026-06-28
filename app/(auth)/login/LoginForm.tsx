"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { SubmitButton } from "@/components/auth/SubmitButton";

const LOGIN_ERRORS: Record<string, string> = {
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Incorrect password. Please try again.",
  "auth/too-many-requests": "Too many attempts. Please try again later.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/invalid-email": "Please enter a valid email address.",
};

export function LoginForm({ next }: { next?: string } = {}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { user } = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await user.getIdToken();

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        setError("Failed to sign in. Please try again.");
        return;
      }

      const { role } = await res.json();
      const destination =
        role === "INSTRUCTOR"
          ? "/dashboard/instructor"
          : next ?? "/dashboard/student";
      router.push(destination);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(LOGIN_ERRORS[code] ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <div>
        <h1 className="font-serif text-[1.75rem] text-text-primary font-normal">
          Welcome back
        </h1>
        <p className="mt-1 text-text-muted text-sm">
          Log in to continue your streak.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="EMAIL"
          type="email"
          value={email}
          onChange={setEmail}
          placeholder="you@example.com"
        />

        <AuthInput
          label="PASSWORD"
          type="password"
          value={password}
          onChange={setPassword}
          placeholder="••••••••"
        />

        {error && (
          <p className="font-mono text-[11px] text-red-400">{error}</p>
        )}

        <SubmitButton loading={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </SubmitButton>
      </form>

      <p className="text-center text-text-muted text-sm">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="text-gold hover:underline">
          Sign up
        </Link>
      </p>
    </AuthCard>
  );
}
