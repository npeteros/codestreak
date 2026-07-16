// Canonical streak/heatmap math, unifying what used to be four independent
// reimplementations (lib/streak/calculate.ts, lib/actions/streak.ts,
// lib/actions/overview.ts, lib/actions/instructor.ts).
//
// IMPORTANT: two of those four implementations respected each course's
// streakRules (only counting a source toward the streak if the course has
// it enabled) and two did not — they counted a day as active if *any*
// source fired, regardless of course settings. That inconsistency predates
// this refactor and is preserved deliberately: every function here takes an
// explicit `rules` parameter, and callers pass either the real course rules
// or ALL_SOURCES_RULE to reproduce their original behavior exactly. See the
// characterization tests (lib/actions/streakDivergence.test.ts) for the
// scenario this pins down, and the refactor plan for why it isn't "fixed"
// here.

import type { StreakEntryDoc, StreakRules } from "@/lib/firebase/types";

export const ALL_SOURCES_RULE: StreakRules = {
  challenge: true,
  checkin: true,
  sprintCard: true,
};

export function isActiveDay(
  sources: StreakEntryDoc["sources"],
  rules: StreakRules
): boolean {
  return (
    (rules.challenge && sources.challenge) ||
    (rules.checkin && sources.checkin) ||
    (rules.sprintCard && sources.sprintCard)
  );
}

export function getHeatmapLevel(
  sources: StreakEntryDoc["sources"],
  rules: StreakRules
): 0 | 1 | 2 | 3 | 4 {
  const n =
    (rules.challenge && sources.challenge ? 1 : 0) +
    (rules.checkin && sources.checkin ? 1 : 0) +
    (rules.sprintCard && sources.sprintCard ? 1 : 0);
  return n === 0 ? 0 : n === 1 ? 2 : n === 2 ? 3 : 4;
}

// Walks backward from today (or yesterday, if today has no activity yet)
// counting consecutive active days.
export function getCurrentStreak(
  entryMap: Map<string, StreakEntryDoc>,
  todayStr: string,
  rules: StreakRules
): number {
  const activeDates = new Set<string>();
  for (const [date, e] of entryMap) {
    if (isActiveDay(e.sources, rules)) activeDates.add(date);
  }

  const cur = new Date(todayStr + "T12:00:00Z");
  if (!activeDates.has(todayStr)) cur.setUTCDate(cur.getUTCDate() - 1);

  let streak = 0;
  while (true) {
    const ds = cur.toISOString().slice(0, 10);
    if (!activeDates.has(ds)) break;
    streak++;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }
  return streak;
}

export function getLongestStreak(
  entryMap: Map<string, StreakEntryDoc>,
  rules: StreakRules
): number {
  const activeDates = [...entryMap.entries()]
    .filter(([, e]) => isActiveDay(e.sources, rules))
    .map(([date]) => date)
    .sort();

  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const ds of activeDates) {
    const d = new Date(ds + "T12:00:00Z");
    if (prev && d.getTime() - prev.getTime() === 86_400_000) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = d;
  }
  return longest;
}

export function getTotalActiveDays(
  entryMap: Map<string, StreakEntryDoc>,
  rules: StreakRules
): number {
  let count = 0;
  for (const [, e] of entryMap) {
    if (isActiveDay(e.sources, rules)) count++;
  }
  return count;
}

// Days since the most recent active day; 999 if there has never been one.
export function getLastActiveDays(
  entryMap: Map<string, StreakEntryDoc>,
  todayStr: string,
  rules: StreakRules
): number {
  const dates = [...entryMap.entries()]
    .filter(([, e]) => isActiveDay(e.sources, rules))
    .map(([date]) => date)
    .sort()
    .reverse();
  if (!dates[0]) return 999;
  const today = new Date(todayStr + "T12:00:00Z");
  const last = new Date(dates[0] + "T12:00:00Z");
  return Math.floor((today.getTime() - last.getTime()) / 86_400_000);
}

// `days` heatmap levels ending on todayStr, chronological ascending.
export function getLevelsForRange(
  entryMap: Map<string, StreakEntryDoc>,
  todayStr: string,
  days: number,
  rules: StreakRules
): Array<{
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
  sources: StreakEntryDoc["sources"] | null;
}> {
  const start = new Date(todayStr + "T12:00:00Z");
  start.setUTCDate(start.getUTCDate() - (days - 1));

  const out: Array<{
    date: string;
    level: 0 | 1 | 2 | 3 | 4;
    sources: StreakEntryDoc["sources"] | null;
  }> = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const e = entryMap.get(ds);
    out.push({
      date: ds,
      level: e ? getHeatmapLevel(e.sources, rules) : 0,
      sources: e ? e.sources : null,
    });
  }
  return out;
}

export function chunkIntoWeeks<T>(flat: T[], weeks: number): T[][] {
  const grid: T[][] = [];
  for (let w = 0; w < weeks; w++) grid.push(flat.slice(w * 7, w * 7 + 7));
  return grid;
}

// Per-day percentage of a class active, bucketed into the same 0-4 levels
// (thresholds are strict-less-than: exactly 25% active maps to level 2).
export function getClassHeatmap(
  allEntries: Map<string, Map<string, StreakEntryDoc>>,
  todayStr: string,
  weeks: number,
  totalStudents: number,
  rules: StreakRules
): number[][] {
  const total = weeks * 7;
  const start = new Date(todayStr + "T12:00:00Z");
  start.setUTCDate(start.getUTCDate() - (total - 1));

  const flat: number[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const ds = d.toISOString().slice(0, 10);
    let activeCount = 0;
    for (const studentEntries of allEntries.values()) {
      const e = studentEntries.get(ds);
      if (e && isActiveDay(e.sources, rules)) activeCount++;
    }
    if (totalStudents === 0 || activeCount === 0) {
      flat.push(0);
      continue;
    }
    const pct = activeCount / totalStudents;
    flat.push(pct < 0.25 ? 1 : pct < 0.5 ? 2 : pct < 0.75 ? 3 : 4);
  }

  return chunkIntoWeeks(flat, weeks);
}
