// Pure streak/heatmap computation used by lib/actions/overview.ts.
// Split out of that file (rather than just `export`ed in place) because
// Next.js requires every export of a "use server" file to be an async
// Server Action — this is a plain sync function.
//
// This was a byte-for-byte twin of lib/actions/streak.ts's computeStreakData
// (same countsForStreak/levelFor logic, same WEEKS_COUNT) — now that both
// delegate to lib/domain/streak.ts, this is just a named re-export so
// lib/actions/overview.ts keeps its own import name.

import type { StreakEntryDoc, StreakRules } from "@/lib/firebase/types";
import type { StreakData } from "./streak";
import { computeStreakData } from "./streak.calc";

const WEEKS_COUNT = 18;

export function computeOverviewStreakData(
  entryMap: Map<string, StreakEntryDoc>,
  streakRules: StreakRules,
  todayStr: string,
  weekCount: number = WEEKS_COUNT
): StreakData {
  return computeStreakData(entryMap, streakRules, todayStr, weekCount);
}
