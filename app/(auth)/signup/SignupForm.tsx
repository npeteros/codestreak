"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithCustomToken } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { signUp } from "@/lib/actions/auth";
import { AuthCard } from "@/components/auth/AuthCard";
import { AuthInput } from "@/components/auth/AuthInput";
import { RoleToggle } from "@/components/auth/RoleToggle";
import { SubmitButton } from "@/components/auth/SubmitButton";
import type { UserRole } from "@/lib/firebase/types";

export function SignupForm({ next }: { next?: string } = {}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState<UserRole>("STUDENT");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const result = await signUp(email, password, name, role);

      if (!result.success) {
        setError(result.error);
        return;
      }

      const { user } = await signInWithCustomToken(auth, result.customToken);
      const idToken = await user.getIdToken(true);

      const res = await fetch("/api/auth/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });

      if (!res.ok) {
        setError("Failed to create session. Please try again.");
        return;
      }

      const destination =
        result.role === "INSTRUCTOR"
          ? "/dashboard/instructor"
          : next ?? "/dashboard/student";
      router.push(destination);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthCard>
      <div>
        <h1 className="font-serif text-[1.75rem] text-text-primary font-normal">
          Create account
        </h1>
        <p className="mt-1 text-text-muted text-sm">
          Start or join a course today.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthInput
          label="NAME"
          type="text"
          value={name}
          onChange={setName}
          placeholder="Full name"
        />

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
          placeholder="Min. 8 characters"
        />

        <AuthInput
          label="CONFIRM PASSWORD"
          type="password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          placeholder="••••••••"
        />

        <div className="space-y-1.5">
          <p className="font-mono text-[11px] tracking-[.08em] text-text-muted">
            I AM A…
          </p>
          <RoleToggle value={role} onChange={setRole} />
        </div>

        {error && (
          <p className="font-mono text-[11px] text-red-400">{error}</p>
        )}

        <SubmitButton loading={loading}>
          {loading ? "Creating account…" : "Create account"}
        </SubmitButton>
      </form>

      <p className="text-center text-text-muted text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-gold hover:underline">
          Log in
        </Link>
      </p>
    </AuthCard>
  );
}
