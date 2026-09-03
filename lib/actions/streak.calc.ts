// Pure streak/heatmap computation used by lib/actions/streak.ts.
// Split out of that file (rather than just `export`ed in place) because
// Next.js requires every export of a "use server" file to be an async
// Server Action — this is a plain sync function.
//
// Delegates to the canonical lib/domain/streak.ts, which respects
// streakRules exactly as this file's original inline implementation did.

import type { StreakEntryDoc, StreakRules } from "@/lib/types";
import type { StreakData } from "./streak";
import {
  getCurrentStreak,
  getLongestStreak,
  getTotalActiveDays,
  getLevelsForRange,
} from "@/lib/domain/streak";

const WEEKS_COUNT = 18;

export function computeStreakData(
  entryMap: Map<string, StreakEntryDoc>,
  streakRules: StreakRules,
  todayStr: string,
  weekCount: number = WEEKS_COUNT
): StreakData {
  return {
    streak: getCurrentStreak(entryMap, todayStr, streakRules),
    longest: getLongestStreak(entryMap, streakRules),
    activeDays: getTotalActiveDays(entryMap, streakRules),
    weekCount,
    entries: getLevelsForRange(entryMap, todayStr, weekCount * 7, streakRules),
  };
}
