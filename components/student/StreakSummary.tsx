import {
  Flame,
  Trophy,
  CalendarDays,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  getCurrentStreak,
  getLongestStreak,
  getTotalActiveDays,
  isActiveDay,
  type StreakEntry,
} from "@/lib/streak/calculate";

interface Props {
  entries: StreakEntry[];
  todayDate: string;
}

export function StreakSummary({ entries, todayDate }: Props) {
  const currentStreak = getCurrentStreak(entries, todayDate);
  const longestStreak = getLongestStreak(entries);
  const totalActiveDays = getTotalActiveDays(entries);
  const todayEntry = entries.find((e) => e.date === todayDate);
  const activeToday = todayEntry ? isActiveDay(todayEntry) : false;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Current Streak */}
      <div className="relative bg-[#1A1A1A] rounded-xl border border-white/[0.07] p-4">
        <div className="absolute top-4 right-4">
          <Flame className="w-4 h-4 text-gold" />
        </div>
        <div className="font-mono text-4xl text-text-primary font-medium leading-none">
          {currentStreak}
        </div>
        <div className="font-mono text-[10px] tracking-[.1em] uppercase text-text-muted mt-2">
          day streak
        </div>
      </div>

      {/* Longest Streak */}
      <div className="relative bg-[#1A1A1A] rounded-xl border border-white/[0.07] p-4">
        <div className="absolute top-4 right-4">
          <Trophy className="w-4 h-4 text-text-muted" />
        </div>
        <div className="font-mono text-4xl text-text-primary font-medium leading-none">
          {longestStreak}
        </div>
        <div className="font-mono text-[10px] tracking-[.1em] uppercase text-text-muted mt-2">
          personal best
        </div>
      </div>

      {/* Total Active Days */}
      <div className="relative bg-[#1A1A1A] rounded-xl border border-white/[0.07] p-4">
        <div className="absolute top-4 right-4">
          <CalendarDays className="w-4 h-4 text-text-muted" />
        </div>
        <div className="font-mono text-4xl text-text-primary font-medium leading-none">
          {totalActiveDays}
        </div>
        <div className="font-mono text-[10px] tracking-[.1em] uppercase text-text-muted mt-2">
          days logged
        </div>
      </div>

      {/* Active Today */}
      <div className="relative bg-[#1A1A1A] rounded-xl border border-white/[0.07] p-4">
        <div className="absolute top-4 right-4">
          {activeToday ? (
            <CheckCircle2 className="w-4 h-4 text-gold" />
          ) : (
            <XCircle className="w-4 h-4 text-text-faint" />
          )}
        </div>
        <div className="mt-1">
          {activeToday ? (
            <CheckCircle2 className="w-8 h-8 text-gold" />
          ) : (
            <XCircle className="w-8 h-8 text-red-400/60" />
          )}
        </div>
        <div className="font-mono text-[10px] tracking-[.1em] uppercase text-text-muted mt-2">
          active today
        </div>
      </div>
    </div>
  );
}
