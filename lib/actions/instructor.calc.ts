// Pure streak/heatmap computation used by lib/actions/instructor.ts.
// Split out of that file (rather than just `export`ed in place) because
// Next.js requires every export of a "use server" file to be an async
// Server Action — these are plain sync functions.
//
// These historically ignored each course's streakRules (any single source
// counted as active) — that is preserved deliberately by passing
// ALL_SOURCES_RULE to the shared lib/domain/streak.ts logic, rather than
// switching to the real course rules. See lib/domain/streak.ts's top
// comment and lib/actions/streakDivergence.test.ts.

import type { StreakEntryDoc } from "@/lib/firebase/types";
import {
  ALL_SOURCES_RULE,
  getCurrentStreak,
  getLastActiveDays,
  getHeatmapLevel,
  getLevelsForRange,
  chunkIntoWeeks,
  getClassHeatmap,
} from "@/lib/domain/streak";

export function calcStreak(
  entryMap: Map<string, StreakEntryDoc>,
  todayStr: string
): number {
  return getCurrentStreak(entryMap, todayStr, ALL_SOURCES_RULE);
}

export function lastActiveDays(entryMap: Map<string, StreakEntryDoc>): number {
  return getLastActiveDays(entryMap, ALL_SOURCES_RULE);
}

export function heatmapLevel(entryMap: Map<string, StreakEntryDoc>, date: string): number {
  const e = entryMap.get(date);
  if (!e) return 0;
  return getHeatmapLevel(e.sources, ALL_SOURCES_RULE);
}

export function buildStudentHeatmap(
  entryMap: Map<string, StreakEntryDoc>,
  todayStr: string,
  weeks: number
): number[][] {
  const levels = getLevelsForRange(entryMap, todayStr, weeks * 7, ALL_SOURCES_RULE).map(
    (c) => c.level
  );
  return chunkIntoWeeks(levels, weeks);
}

export function buildClassHeatmap(
  allEntries: Map<string, Map<string, StreakEntryDoc>>,
  todayStr: string,
  weeks: number,
  totalStudents: number
): number[][] {
  return getClassHeatmap(allEntries, todayStr, weeks, totalStudents, ALL_SOURCES_RULE);
}
