"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Zap, CircleCheck, BarChart3, BookOpen } from "lucide-react";
import { getOverviewSummary, type OverviewSummary } from "@/lib/actions/overview";
import type { ChallengeDifficulty, JournalTriggerType } from "@/lib/firebase/types";

const Markdown = dynamic(() => import("@/components/ui/Markdown"));

export interface CourseOption {
  id: string;
  name: string;
  timezone: string;
}

interface Props {
  userName: string;
  courses: CourseOption[];
  initialCourseId: string;
  initialGreetingTime: string;
  initialSummary: OverviewSummary | null;
}

const DIFFICULTY_LABEL: Record<ChallengeDifficulty, string> = {
  EASY: "Easy",
  MEDIUM: "Medium",
  HARD: "Hard",
};

const TRIGGER_LABEL: Record<JournalTriggerType, string> = {
  CHALLENGE: "Daily Challenge",
  CHECKIN: "Check-in",
  SPRINT_CARD: "Sprint Card",
};


function computeTimeOfDay(timezone: string): string {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
    10
  );
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86_400_000);
  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  if (diffDays === 0) return `Today, ${timeStr}`;
  if (diffDays === 1) return `Yesterday, ${timeStr}`;
  return (
    date.toLocaleDateString("en-US", { month: "short", day: "numeric" }) +
    `, ${timeStr}`
  );
}

function CardSkeleton() {
  return (
    <div className="bg-surface border border-white/[0.07] rounded-[15px] p-[18px] h-[150px] flex flex-col gap-3 animate-pulse">
      <div className="h-3 w-36 bg-white/[0.07] rounded" />
      <div className="h-5 w-3/4 bg-white/[0.07] rounded" />
      <div className="h-3 w-1/2 bg-white/[0.07] rounded mt-auto" />
    </div>
  );
}

// ── Module cards ──────────────────────────────────────────────────────────────

const cardBase =
  "group bg-surface border border-white/[0.07] rounded-[15px] p-[18px] flex flex-col gap-[13px] cursor-pointer transition-[border-color,transform] duration-150 hover:border-gold/40 hover:-translate-y-0.5";

function CardHeader({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center justify-between text-text-secondary">
      <div className="flex items-center gap-[9px]">
        <Icon size={17} className="text-gold flex-none" />
        <span className="text-[13px] font-semibold text-text-secondary">
          {label}
        </span>
      </div>
      <span className="text-text-faint text-sm">→</span>
    </div>
  );
}

function DailyChallengePill({ difficulty }: { difficulty: ChallengeDifficulty }) {
  return (
    <span className="font-mono text-[11px] text-gold border border-gold/40 rounded-full px-[9px] py-[2px]">
      {DIFFICULTY_LABEL[difficulty]}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function StudentOverviewClient({
  userName,
  courses,
  initialCourseId,
  initialGreetingTime,
  initialSummary,
}: Props) {
  const router = useRouter();

  const [selectedCourseId, setSelectedCourseId] = useState(initialCourseId);
  const [greetingTime, setGreetingTime] = useState(initialGreetingTime);
  const [summary, setSummary] = useState<OverviewSummary | null>(initialSummary);
  const [isLoading, setIsLoading] = useState(false);

  // Sync when server re-renders with a new course
  useEffect(() => {
    setSelectedCourseId(initialCourseId);
    setGreetingTime(initialGreetingTime);
    setSummary(initialSummary);
  }, [initialCourseId, initialGreetingTime, initialSummary]);

  function handleCourseChange(courseId: string) {
    const course = courses.find((c) => c.id === courseId);
    if (course) setGreetingTime(computeTimeOfDay(course.timezone));
    setSelectedCourseId(courseId);
    setIsLoading(true);
    setSummary(null);
    router.push(`/dashboard/student?courseId=${courseId}`);
    getOverviewSummary(courseId)
      .then((result) => {
        if (result.success) {
          setSummary({
            streakData: result.streakData,
            challenge: result.challenge,
            latestCheckIn: result.latestCheckIn,
            sprint: result.sprint,
            latestJournal: result.latestJournal,
          });
        }
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }

  const sprint = summary?.sprint ?? { todo: 0, inProgress: 0, done: 0 };
  const total = sprint.todo + sprint.inProgress + sprint.done;
  const donePct = total > 0 ? Math.round((sprint.done / total) * 100) : 0;
  const selectedCourseName =
    courses.find((c) => c.id === selectedCourseId)?.name ?? "";

  return (
    <div className="flex flex-col gap-[22px] max-w-[1180px]">

      {/* Greeting */}
      <div className="flex flex-col gap-[3px]">
        <h2 className="font-serif font-normal text-[27px] text-text-primary tracking-[-0.01em] leading-tight">
          Good {greetingTime}, {userName}.
        </h2>
        <p className="text-sm text-text-muted">
          Everything below feeds one streak. Keep it alive.
        </p>
      </div>

      {/* Course selector — multi-course students only */}
      {courses.length > 1 && (
        <div className="flex flex-col gap-2">
          <label className="font-mono text-[11px] tracking-[.12em] text-text-faint uppercase">
            Course
          </label>
          <select
            value={selectedCourseId}
            onChange={(e) => handleCourseChange(e.target.value)}
            className="w-full max-w-xs bg-surface border border-white/[0.10] rounded-xl px-4 py-2.5 font-sans text-sm text-text-primary appearance-none cursor-pointer focus:outline-none focus:border-gold/50 transition-colors"
          >
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Module cards grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Daily Challenge */}
          <Link
            href={`/dashboard/student/challenge?courseId=${selectedCourseId}`}
            className={cardBase}
          >
            <CardHeader icon={Zap} label="Daily Challenge" />
            {summary?.challenge ? (
              <>
                <div className="font-serif text-[20px] text-text-primary leading-[1.15]">
                  {summary.challenge.title}
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <DailyChallengePill difficulty={summary.challenge.difficulty} />
                  <span
                    className="font-mono text-[11.5px]"
                    style={{
                      color: summary.challenge.alreadySubmitted
                        ? "var(--color-gold)"
                        : "#6b6964",
                    }}
                  >
                    {summary.challenge.alreadySubmitted
                      ? "Completed today"
                      : "Not started"}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-text-faint mt-auto">
                No challenge scheduled today.
              </p>
            )}
          </Link>

          {/* Check-in */}
          <Link
            href={`/dashboard/student/checkin?courseId=${selectedCourseId}`}
            className={cardBase}
          >
            <CardHeader icon={CircleCheck} label="Check-in" />
            {summary?.latestCheckIn ? (
              <>
                <div className="font-mono text-[11.5px] text-gold">
                  {selectedCourseName}
                </div>
                <div className="text-[13.5px] text-text-muted leading-[1.55] line-clamp-2">
                  {summary.latestCheckIn.note}
                </div>
                <div className="font-mono text-[11px] text-text-faint mt-auto">
                  {formatRelativeTime(summary.latestCheckIn.createdAt)}
                </div>
              </>
            ) : (
              <p className="text-sm text-text-faint mt-auto">
                No check-ins yet — log one today.
              </p>
            )}
          </Link>

          {/* Sprint Board */}
          <Link
            href={`/dashboard/student/sprint?courseId=${selectedCourseId}`}
            className={cardBase}
          >
            <CardHeader icon={BarChart3} label="Sprint Board" />
            <div className="flex gap-4 font-mono text-[12px] text-text-muted">
              <span>{sprint.todo} To Do</span>
              <span>{sprint.inProgress} Active</span>
              <span className="text-gold">{sprint.done} Done</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.08] overflow-hidden mt-auto">
              <div
                className="h-full bg-gold rounded-full transition-[width] duration-300"
                style={{ width: `${donePct}%` }}
              />
            </div>
          </Link>

          {/* AI Journal */}
          <Link
            href={`/dashboard/student/journal?courseId=${selectedCourseId}`}
            className={cardBase}
          >
            <CardHeader icon={BookOpen} label="AI Journal" />
            {summary?.latestJournal ? (
              <>
                <div className="markdown-body text-[13.5px] text-text-primary leading-[1.6] italic line-clamp-3">
                  <Markdown>{summary.latestJournal.content}</Markdown>
                </div>
                <div className="font-mono text-[11px] text-text-faint mt-auto">
                  {TRIGGER_LABEL[summary.latestJournal.triggerType]} ·{" "}
                  {formatRelativeTime(summary.latestJournal.createdAt)}
                </div>
              </>
            ) : (
              <p className="text-sm text-text-faint mt-auto">
                No journal entries yet.
              </p>
            )}
          </Link>

        </div>
      )}

    </div>
  );
}
