// Feeds the still-unmounted StreakSummary/ActivityHeatmap components (see
// components/student/{StreakSummary,ActivityHeatmap}.tsx and
// lib/actions/streak.ts's getStreakEntries()). Kept in sync with the
// canonical logic in lib/domain/streak.ts rather than reimplementing it, in
// case these components get wired up later.

import type { StreakEntryDoc } from "@/lib/firebase/types";
import {
  ALL_SOURCES_RULE,
  isActiveDay as domainIsActiveDay,
  getCurrentStreak as domainGetCurrentStreak,
  getLongestStreak as domainGetLongestStreak,
  getTotalActiveDays as domainGetTotalActiveDays,
} from "@/lib/domain/streak";

export type StreakEntry = StreakEntryDoc;

export interface HeatmapCell {
  date: string;
  active: boolean;
  sources: StreakEntry["sources"] | null;
}

export function isActiveDay(entry: StreakEntry): boolean {
  return domainIsActiveDay(entry.sources, ALL_SOURCES_RULE);
}

function toMap(entries: StreakEntry[]): Map<string, StreakEntry> {
  const m = new Map<string, StreakEntry>();
  for (const e of entries) m.set(e.date, e);
  return m;
}

// entries must be sorted descending by date
export function getCurrentStreak(
  entries: StreakEntry[],
  todayDate: string
): number {
  return domainGetCurrentStreak(toMap(entries), todayDate, ALL_SOURCES_RULE);
}

export function getLongestStreak(entries: StreakEntry[]): number {
  return domainGetLongestStreak(toMap(entries), ALL_SOURCES_RULE);
}

export function getTotalActiveDays(entries: StreakEntry[]): number {
  return domainGetTotalActiveDays(toMap(entries), ALL_SOURCES_RULE);
}

// Returns 365 cells ordered oldest → newest
export function getHeatmapGrid(
  entries: StreakEntry[],
  todayDate: string
): HeatmapCell[] {
  const entryMap = toMap(entries);

  const today = new Date(todayDate + "T12:00:00Z");
  const cells: HeatmapCell[] = [];

  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setUTCDate(d.getUTCDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const entry = entryMap.get(ds);
    cells.push({
      date: ds,
      active: entry ? isActiveDay(entry) : false,
      sources: entry ? entry.sources : null,
    });
  }

  return cells;
}
