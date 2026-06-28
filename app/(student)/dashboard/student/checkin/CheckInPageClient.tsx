"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck, CheckCircle2, ClipboardList, Loader2 } from "lucide-react";
import { CheckInCard } from "@/components/student/CheckInCard";
import { createCheckIn } from "@/lib/actions/checkins";
import type { CheckIn } from "@/lib/firebase/types";

const MAX_CHARS = 500;
const GOLD_THRESHOLD = 100; // chars remaining

export interface CourseOption {
  id: string;
  name: string;
  timezone: string;
}

interface Props {
  courses: CourseOption[];
  initialCourseId: string;
  initialCheckIns: CheckIn[];
  initialAlreadyCheckedIn: boolean;
}

export function CheckInPageClient({
  courses,
  initialCourseId,
  initialCheckIns,
  initialAlreadyCheckedIn,
}: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [checkIns, setCheckIns] = useState<CheckIn[]>(initialCheckIns);
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(
    initialAlreadyCheckedIn
  );

  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync state when server re-renders with new course data
  useEffect(() => {
    setCheckIns(initialCheckIns);
    setAlreadyCheckedIn(initialAlreadyCheckedIn);
    setNote("");
    setShowSuccess(false);
    setErrorMsg(null);
  }, [initialCourseId, initialCheckIns, initialAlreadyCheckedIn]);

  // Cleanup success timer on unmount
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  const selectedCourse =
    courses.find((c) => c.id === initialCourseId) ?? courses[0];

  function handleCourseChange(courseId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("courseId", courseId);
    router.push(`?${params.toString()}`);
  }

  const charsUsed = note.length;
  const charsRemaining = MAX_CHARS - charsUsed;
  const isAtLimit = charsUsed >= MAX_CHARS;
  const isOverLimit = charsUsed > MAX_CHARS;

  const counterColor = isAtLimit
    ? "text-red-400"
    : charsRemaining <= GOLD_THRESHOLD
    ? "text-gold"
    : "text-text-faint";

  const canSubmit = note.trim().length > 0 && !isOverLimit && !isSubmitting;

  async function handleSubmit() {
    if (!canSubmit || !selectedCourse) return;

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await createCheckIn(selectedCourse.id, note.trim());

    if (result.success) {
      // Optimistically prepend to feed
      setCheckIns((prev) => [result.checkIn, ...prev].slice(0, 7));
      setAlreadyCheckedIn(true);
      setNote("");
      setShowSuccess(true);

      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => setShowSuccess(false), 3000);
    } else {
      if (result.error === "already_checked_in") {
        setAlreadyCheckedIn(true);
        setErrorMsg("You've already checked in today.");
      } else {
        setErrorMsg("Something went wrong. Please try again.");
      }
    }

    setIsSubmitting(false);
  }

  return (
    <div className="space-y-8">
      {/* Course selector — only shown when enrolled in multiple courses */}
      {courses.length > 1 && (
        <div className="space-y-2">
          <label className="block font-mono text-[11px] tracking-[.12em] text-text-faint uppercase">
            Course
          </label>
          <select
            value={initialCourseId}
            onChange={(e) => handleCourseChange(e.target.value)}
            className="
              w-full max-w-xs
              bg-surface border border-white/[0.10] rounded-xl
              px-4 py-2.5
              font-sans text-sm text-text-primary
              appearance-none cursor-pointer
              focus:outline-none focus:border-gold/50
              transition-colors
            "
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Check-in form */}
      <div className="space-y-3">
        {alreadyCheckedIn ? (
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.08] px-5 py-4 bg-surface">
            <CalendarCheck className="w-5 h-5 text-gold/70 shrink-0" />
            <p className="text-sm text-text-secondary">
              You&apos;ve already checked in today. See you tomorrow!
            </p>
          </div>
        ) : (
          <>
            {/* Textarea with character counter */}
            <div className="relative">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Fixed the off-by-one error in my loop, started working on the login form..."
                rows={4}
                className="
                  w-full
                  bg-surface border border-white/[0.10] rounded-xl
                  px-4 py-3 pr-4 pb-8
                  font-sans text-sm text-text-primary
                  resize-y
                  focus:outline-none focus:border-gold/50
                  transition-colors
                  placeholder:text-text-faint
                "
                style={{ minHeight: "120px" }}
                disabled={isSubmitting}
              />
              {/* Character counter */}
              <span
                className={`absolute bottom-3 right-4 font-mono text-[11px] select-none transition-colors ${counterColor}`}
              >
                {charsUsed} / {MAX_CHARS}
              </span>
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="
                w-full flex items-center justify-center gap-2
                bg-gold text-bg
                rounded-xl px-4 py-3
                font-sans font-semibold text-sm
                transition-opacity
                disabled:opacity-40 disabled:cursor-not-allowed
                hover:opacity-90
              "
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Logging...
                </>
              ) : (
                "Log Check-in"
              )}
            </button>
          </>
        )}

        {/* Success message */}
        {showSuccess && (
          <div className="flex items-center gap-2 text-sm text-gold">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Check-in logged! Keep it up.</span>
          </div>
        )}

        {/* Error message */}
        {errorMsg && (
          <p className="text-sm text-red-400">{errorMsg}</p>
        )}
      </div>

      {/* Recent check-ins feed */}
      <div className="space-y-3">
        <h2 className="font-mono text-[11px] tracking-[.12em] text-text-faint uppercase">
          Recent Check-ins
        </h2>

        {checkIns.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <ClipboardList className="w-8 h-8 text-text-faint/50" />
            <p className="text-sm text-text-faint">
              No check-ins yet. Log your first one above.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {checkIns.map((ci) => (
              <CheckInCard
                key={ci.id}
                checkIn={ci}
                timezone={selectedCourse?.timezone}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
