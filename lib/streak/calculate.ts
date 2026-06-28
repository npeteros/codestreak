export interface StreakEntry {
  date: string;
  sources: {
    challenge: boolean;
    checkin: boolean;
    sprintCard: boolean;
  };
}

export interface HeatmapCell {
  date: string;
  active: boolean;
  sources: StreakEntry["sources"] | null;
}

export function isActiveDay(entry: StreakEntry): boolean {
  return (
    (entry.sources.challenge ?? false) ||
    (entry.sources.checkin ?? false) ||
    (entry.sources.sprintCard ?? false)
  );
}

// entries must be sorted descending by date
export function getCurrentStreak(
  entries: StreakEntry[],
  todayDate: string
): number {
  const activeDates = new Set(entries.filter(isActiveDay).map((e) => e.date));

  const cur = new Date(todayDate + "T12:00:00Z");
  if (!activeDates.has(todayDate)) {
    cur.setUTCDate(cur.getUTCDate() - 1);
  }

  let streak = 0;
  while (true) {
    const ds = cur.toISOString().slice(0, 10);
    if (!activeDates.has(ds)) break;
    streak++;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }
  return streak;
}

export function getLongestStreak(entries: StreakEntry[]): number {
  const sorted = entries
    .filter(isActiveDay)
    .map((e) => e.date)
    .sort();

  let longest = 0;
  let run = 0;
  let prev: Date | null = null;

  for (const ds of sorted) {
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

export function getTotalActiveDays(entries: StreakEntry[]): number {
  return entries.filter(isActiveDay).length;
}

// Returns 365 cells ordered oldest → newest
export function getHeatmapGrid(
  entries: StreakEntry[],
  todayDate: string
): HeatmapCell[] {
  const entryMap = new Map<string, StreakEntry>();
  for (const e of entries) {
    entryMap.set(e.date, e);
  }

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
