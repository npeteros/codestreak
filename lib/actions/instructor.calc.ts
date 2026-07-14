// Pure streak/heatmap computation used by lib/actions/instructor.ts.
// Split out of that file (rather than just `export`ed in place) because
// Next.js requires every export of a "use server" file to be an async
// Server Action — these are plain sync functions. No logic change from
// their original private definitions in instructor.ts.

import type { StreakEntryDoc } from "@/lib/firebase/types";

export function calcStreak(
  entryMap: Map<string, StreakEntryDoc>,
  todayStr: string
): number {
  const activeDates = new Set<string>();
  for (const [date, e] of entryMap) {
    if (e.sources.challenge || e.sources.checkin || e.sources.sprintCard)
      activeDates.add(date);
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

export function lastActiveDays(entryMap: Map<string, StreakEntryDoc>): number {
  const dates = [...entryMap.entries()]
    .filter(([, e]) => e.sources.challenge || e.sources.checkin || e.sources.sprintCard)
    .map(([date]) => date)
    .sort()
    .reverse();
  if (!dates[0]) return 999;
  const ms = Date.now() - new Date(dates[0] + "T12:00:00Z").getTime();
  return Math.floor(ms / 86_400_000);
}

export function heatmapLevel(entryMap: Map<string, StreakEntryDoc>, date: string): number {
  const e = entryMap.get(date);
  if (!e) return 0;
  const n =
    (e.sources.challenge ? 1 : 0) +
    (e.sources.checkin ? 1 : 0) +
    (e.sources.sprintCard ? 1 : 0);
  return n === 0 ? 0 : n === 1 ? 2 : n === 2 ? 3 : 4;
}

export function buildStudentHeatmap(
  entryMap: Map<string, StreakEntryDoc>,
  todayStr: string,
  weeks: number
): number[][] {
  const total = weeks * 7;
  const start = new Date(todayStr + "T12:00:00Z");
  start.setUTCDate(start.getUTCDate() - (total - 1));

  const flat: number[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    flat.push(heatmapLevel(entryMap, d.toISOString().slice(0, 10)));
  }

  const grid: number[][] = [];
  for (let w = 0; w < weeks; w++) grid.push(flat.slice(w * 7, w * 7 + 7));
  return grid;
}

export function buildClassHeatmap(
  allEntries: Map<string, Map<string, StreakEntryDoc>>,
  todayStr: string,
  weeks: number,
  totalStudents: number
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
      if (e && (e.sources.challenge || e.sources.checkin || e.sources.sprintCard))
        activeCount++;
    }
    if (totalStudents === 0 || activeCount === 0) { flat.push(0); continue; }
    const pct = activeCount / totalStudents;
    flat.push(pct < 0.25 ? 1 : pct < 0.5 ? 2 : pct < 0.75 ? 3 : 4);
  }

  const grid: number[][] = [];
  for (let w = 0; w < weeks; w++) grid.push(flat.slice(w * 7, w * 7 + 7));
  return grid;
}
