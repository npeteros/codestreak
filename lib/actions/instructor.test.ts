import { describe, it, expect } from "vitest";
import {
  calcStreak,
  lastActiveDays,
  heatmapLevel,
  buildStudentHeatmap,
  buildClassHeatmap,
} from "./instructor.calc";
import type { StreakEntryDoc } from "@/lib/firebase/types";

const TODAY = "2026-07-15";

function entry(sources: Partial<StreakEntryDoc["sources"]> = {}): StreakEntryDoc {
  return {
    date: "",
    sources: {
      challenge: sources.challenge ?? false,
      checkin: sources.checkin ?? false,
      sprintCard: sources.sprintCard ?? false,
    },
  };
}

function mapFrom(entries: Record<string, StreakEntryDoc>): Map<string, StreakEntryDoc> {
  return new Map(Object.entries(entries));
}

function classMapFrom(
  students: Record<string, Record<string, StreakEntryDoc>>
): Map<string, Map<string, StreakEntryDoc>> {
  const m = new Map<string, Map<string, StreakEntryDoc>>();
  for (const [sid, entries] of Object.entries(students)) m.set(sid, mapFrom(entries));
  return m;
}

describe("calcStreak / lastActiveDays / heatmapLevel (lib/actions/instructor.ts)", () => {
  it("is streakRules-blind — a single sprintCard-only day counts as active (unlike streak.ts/overview.ts)", () => {
    const map = mapFrom({ [TODAY]: entry({ sprintCard: true }) });
    expect(calcStreak(map, TODAY)).toBe(1);
  });

  it("returns 0 / 999 sentinel for an empty entry map", () => {
    const map = mapFrom({});
    expect(calcStreak(map, TODAY)).toBe(0);
    expect(lastActiveDays(map)).toBe(999);
  });

  it("does not break the streak when today has no activity yet", () => {
    const map = mapFrom({
      "2026-07-14": entry({ checkin: true }),
      "2026-07-13": entry({ checkin: true }),
    });
    expect(calcStreak(map, TODAY)).toBe(2);
  });

  it("treats an entry doc with all sources false as inactive", () => {
    const map = mapFrom({ [TODAY]: entry() });
    expect(calcStreak(map, TODAY)).toBe(0);
    expect(lastActiveDays(map)).toBe(999);
  });

  it("buckets heatmap level as 0/2/3/4 (never 1), and 0 when no doc exists for the date", () => {
    const map = mapFrom({
      "2026-07-15": entry({ checkin: true }),
      "2026-07-14": entry({ checkin: true, challenge: true }),
      "2026-07-13": entry({ checkin: true, challenge: true, sprintCard: true }),
      "2026-07-12": entry(),
    });
    expect(heatmapLevel(map, "2026-07-15")).toBe(2);
    expect(heatmapLevel(map, "2026-07-14")).toBe(3);
    expect(heatmapLevel(map, "2026-07-13")).toBe(4);
    expect(heatmapLevel(map, "2026-07-12")).toBe(0);
    expect(heatmapLevel(map, "2026-07-11")).toBe(0);
  });

  it("buildStudentHeatmap returns a weeks x 7 grid whose last cell is today", () => {
    const grid = buildStudentHeatmap(mapFrom({ [TODAY]: entry({ checkin: true }) }), TODAY, 2);
    expect(grid).toHaveLength(2);
    expect(grid[0]).toHaveLength(7);
    expect(grid[1][6]).toBe(2);
  });
});

describe("buildClassHeatmap (lib/actions/instructor.ts)", () => {
  it("returns hard 0s (not NaN) when there are 0 enrolled students", () => {
    const grid = buildClassHeatmap(new Map(), TODAY, 1, 0);
    expect(grid.flat().every((v) => v === 0)).toBe(true);
  });

  it("returns 0 for a day with 0 active students even when students are enrolled", () => {
    const allEntries = classMapFrom({ s1: {}, s2: {} });
    const grid = buildClassHeatmap(allEntries, TODAY, 1, 2);
    expect(grid.flat().every((v) => v === 0)).toBe(true);
  });

  it("maps exactly 25% active to level 2, not level 1 (strict < threshold)", () => {
    const allEntries = classMapFrom({
      s1: { [TODAY]: entry({ checkin: true }) },
      s2: {},
      s3: {},
      s4: {},
    });
    expect(buildClassHeatmap(allEntries, TODAY, 1, 4)[0][6]).toBe(2);
  });

  it("maps exactly 50% active to level 3", () => {
    const allEntries = classMapFrom({
      s1: { [TODAY]: entry({ checkin: true }) },
      s2: { [TODAY]: entry({ checkin: true }) },
      s3: {},
      s4: {},
    });
    expect(buildClassHeatmap(allEntries, TODAY, 1, 4)[0][6]).toBe(3);
  });

  it("maps exactly 75% active to level 4", () => {
    const allEntries = classMapFrom({
      s1: { [TODAY]: entry({ checkin: true }) },
      s2: { [TODAY]: entry({ checkin: true }) },
      s3: { [TODAY]: entry({ checkin: true }) },
      s4: {},
    });
    expect(buildClassHeatmap(allEntries, TODAY, 1, 4)[0][6]).toBe(4);
  });
});
