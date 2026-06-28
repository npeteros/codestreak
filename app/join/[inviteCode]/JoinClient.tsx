"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Logomark } from "@/components/brand/Logomark";
import { joinCourse } from "@/lib/actions/courses";

interface Course {
  courseId: string;
  name: string;
  description: string;
  languageTag: string;
}

interface Props {
  inviteCode: string;
  course: Course;
  authState: "unauthenticated" | "not_enrolled" | "instructor";
}

export function JoinClient({ inviteCode, course, authState }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleJoin() {
    startTransition(async () => {
      const result = await joinCourse(inviteCode);
      if (result.success) {
        router.push("/dashboard/student");
      } else {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <div className="min-h-screen bg-[#0F0F0F] flex items-center justify-center p-8">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex items-center gap-3">
          <Logomark className="w-8 h-8" />
          <span className="font-serif text-2xl text-text-primary">CodeStreak</span>
        </div>

        {authState === "instructor" ? (
          <div className="space-y-5">
            <div>
              <h1 className="font-serif text-[1.75rem] text-text-primary font-normal">
                This link is for students
              </h1>
              <p className="mt-1 text-sm text-text-muted">
                You&apos;re signed in as an instructor. Join links are for students to enroll in courses.
              </p>
            </div>
            <Link
              href="/dashboard/instructor"
              className="block w-full text-center bg-gold text-bg rounded-[9px] px-5 py-[11px] font-sans text-[14px] font-semibold hover:brightness-105 transition-all"
            >
              Go to instructor dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <p className="font-mono text-[11px] tracking-[.12em] text-text-muted mb-2">
                YOU&apos;VE BEEN INVITED TO JOIN
              </p>
              <h1 className="font-serif text-[1.75rem] text-text-primary font-normal">
                {course.name}
              </h1>
              {course.description && (
                <p className="mt-1.5 text-sm text-text-muted leading-relaxed">
                  {course.description}
                </p>
              )}
              <span className="inline-block mt-3 font-mono text-[11px] text-text-muted bg-white/[0.06] border border-white/[0.08] rounded-[6px] px-2.5 py-1">
                {course.languageTag}
              </span>
            </div>

            {authState === "unauthenticated" ? (
              <div className="space-y-3">
                <Link
                  href={`/signup?next=/join/${inviteCode}`}
                  className="block w-full text-center bg-gold text-bg rounded-[9px] px-5 py-[11px] font-sans text-[14px] font-semibold hover:brightness-105 transition-all"
                >
                  Create account &amp; join
                </Link>
                <Link
                  href={`/login?next=/join/${inviteCode}`}
                  className="block w-full text-center bg-transparent border border-white/[0.18] text-text-primary rounded-[9px] px-5 py-[11px] font-sans text-[14px] font-semibold hover:border-white/30 transition-all"
                >
                  Sign in to join
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {error && (
                  <p className="font-mono text-[11px] text-red-400">{error}</p>
                )}
                <button
                  onClick={handleJoin}
                  disabled={isPending}
                  className="w-full bg-gold text-bg rounded-[9px] px-5 py-[11px] font-sans text-[14px] font-semibold hover:brightness-105 transition-all disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
                >
                  {isPending ? "Joining…" : "Join course"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
