// Pure streak/heatmap computation used by lib/actions/overview.ts.
// Split out of that file (rather than just `export`ed in place) because
// Next.js requires every export of a "use server" file to be an async
// Server Action — this is a plain sync function. No logic change from its
// original inline implementation in getOverviewSummary().

import type { StreakEntryDoc, StreakRules } from "@/lib/firebase/types";
import type { StreakData } from "./streak";

const WEEKS_COUNT = 18;

export function computeOverviewStreakData(
  entryMap: Map<string, StreakEntryDoc>,
  streakRules: StreakRules,
  todayStr: string,
  weekCount: number = WEEKS_COUNT
): StreakData {
  const countsForStreak = (e: StreakEntryDoc) =>
    (streakRules.challenge && e.sources.challenge) ||
    (streakRules.checkin && e.sources.checkin) ||
    (streakRules.sprintCard && e.sources.sprintCard);

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

  const activeDates = new Set<string>();
  for (const [date, entry] of entryMap) {
    if (countsForStreak(entry)) activeDates.add(date);
  }

  const todayUTC = new Date(todayStr + "T12:00:00Z");

  let streak = 0;
  const cur = new Date(todayUTC);
  if (!activeDates.has(todayStr)) cur.setUTCDate(cur.getUTCDate() - 1);
  while (true) {
    const ds = cur.toISOString().slice(0, 10);
    if (!activeDates.has(ds)) break;
    streak++;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }

  let longest = 0,
    run = 0;
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

  const cellCount = weekCount * 7;
  const startDate = new Date(todayUTC);
  startDate.setUTCDate(startDate.getUTCDate() - (cellCount - 1));
  const heatEntries: StreakData["entries"] = [];
  for (let i = 0; i < cellCount; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const e = entryMap.get(ds);
    heatEntries.push({ date: ds, level: e ? levelFor(e) : 0 });
  }

  return {
    streak,
    longest,
    activeDays: activeDates.size,
    weekCount,
    entries: heatEntries,
  };
}
