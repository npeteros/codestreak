// Pure streak/heatmap computation used by lib/actions/streak.ts.
// Split out of that file (rather than just `export`ed in place) because
// Next.js requires every export of a "use server" file to be an async
// Server Action — this is a plain sync function. No logic change from its
// original inline implementation in getStreakData().

import type { StreakEntryDoc, StreakRules } from "@/lib/firebase/types";
import type { StreakData, StreakEntry } from "./streak";

const WEEKS_COUNT = 18;

export function computeStreakData(
  entryMap: Map<string, StreakEntryDoc>,
  streakRules: StreakRules,
  todayStr: string,
  weekCount: number = WEEKS_COUNT
): StreakData {
  // True if this entry counts toward the streak given course rules
  const countsForStreak = (e: StreakEntryDoc) =>
    (streakRules.challenge && e.sources.challenge) ||
    (streakRules.checkin && e.sources.checkin) ||
    (streakRules.sprintCard && e.sources.sprintCard);

  // Heatmap intensity: number of active sources mapped to 0–4 scale
  const levelFor = (e: StreakEntryDoc): 0 | 1 | 2 | 3 | 4 => {
    const n =
      (streakRules.challenge && e.sources.challenge ? 1 : 0) +
      (streakRules.checkin && e.sources.checkin ? 1 : 0) +
      (streakRules.sprintCard && e.sources.sprintCard ? 1 : 0);
    if (n === 0) return 0;
    if (n === 1) return 2;
    if (n === 2) return 3;
    return 4;
  };

  // Set of dates with at least one streak-counting source
  const activeDates = new Set<string>();
  for (const [date, entry] of entryMap) {
    if (countsForStreak(entry)) activeDates.add(date);
  }

  // Current consecutive streak (walk backwards from today)
  let streak = 0;
  const todayUTC = new Date(todayStr + "T12:00:00Z");
  const cur = new Date(todayUTC);
  if (!activeDates.has(todayStr)) cur.setUTCDate(cur.getUTCDate() - 1);
  while (true) {
    const ds = cur.toISOString().slice(0, 10);
    if (!activeDates.has(ds)) break;
    streak++;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }

  // Best (longest) streak ever
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const ds of [...activeDates].sort()) {
    const d = new Date(ds + "T12:00:00Z");
    if (prev && d.getTime() - prev.getTime() === 86_400_000) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = d;
  }

  // Heatmap grid for the last `weekCount` weeks
  const cellCount = weekCount * 7;
  const startDate = new Date(todayUTC);
  startDate.setUTCDate(startDate.getUTCDate() - (cellCount - 1));

  const entries: StreakEntry[] = [];
  for (let i = 0; i < cellCount; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const e = entryMap.get(ds);
    entries.push({ date: ds, level: e ? levelFor(e) : 0 });
  }

  return {
    streak,
    longest,
    activeDays: activeDates.size,
    weekCount,
    entries,
  };
}
