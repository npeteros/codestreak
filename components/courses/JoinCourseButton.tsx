"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinPublicCourse } from "@/lib/actions/courses";
import { SignUpGateModal } from "@/components/auth/SignUpGateModal";

interface Props {
  courseId: string;
  isGuest: boolean;
  label?: string;
  gateMessage?: string;
  redirectTo?: string;
}

// Joins the viewer into the course, then sends them to the real (authenticated)
// dashboard page to continue — e.g. to actually submit a challenge. Guests
// see a sign-up modal instead of the join action firing. Shared across the
// public course/challenge/practice pages under app/(public)/courses/[courseId]/**.
export function JoinCourseButton({
  courseId,
  isGuest,
  label = "Join course",
  gateMessage = "Create a free student account to join this course.",
  redirectTo = "/dashboard/student",
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [gateOpen, setGateOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleJoin() {
    if (isGuest) {
      setGateOpen(true);
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await joinPublicCourse(courseId);
      if (res.success) {
        router.push(redirectTo);
      } else {
        setError("Something went wrong. Try again.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleJoin}
        disabled={isPending}
        className="self-start bg-gold text-bg border-none rounded-[9px] px-5 py-[11px] font-sans text-[14px] font-semibold cursor-pointer hover:brightness-105 transition-all disabled:opacity-60"
      >
        {isPending ? "Joining…" : label}
      </button>
      {error && <p className="font-mono text-[11px] text-red-400 m-0">{error}</p>}

      <SignUpGateModal
        open={gateOpen}
        onClose={() => setGateOpen(false)}
        message={gateMessage}
        next={`/courses/${courseId}`}
      />
    </div>
  );
}
