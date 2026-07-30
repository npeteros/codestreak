import { describe, it, expect } from "vitest";
import { computeStreakData } from "./streak.calc";
import { computeOverviewStreakData } from "./overview.calc";
import { calcStreak, heatmapLevel } from "./instructor.calc";
import { isActiveDay, getCurrentStreak } from "@/lib/streak/calculate";
import type { StreakEntryDoc, StreakRules } from "@/lib/firebase/types";

const TODAY = "2026-07-15";

function entry(sources: Partial<StreakEntryDoc["sources"]> = {}): StreakEntryDoc {
  return {
    date: "",
    sources: {
      challenge: sources.challenge ?? false,
      checkin: sources.checkin ?? false,
      sprintCard: sources.sprintCard ?? false,
      practice: sources.practice ?? false,
    },
  };
}

/**
 * Pins a pre-existing production inconsistency (found while reading the code,
 * not introduced by this refactor — see the refactor plan's "Explicit
 * decisions" section): when a course disables the `sprintCard` streak
 * source, the student-facing streak.ts/overview.ts implementations
 * correctly stop counting sprintCard-only days, but instructor.ts's
 * roster/overview/student-detail views and the unmounted
 * lib/streak/calculate.ts (StreakSummary/ActivityHeatmap) ignore
 * streakRules entirely and still count them.
 *
 * These tests lock in *both* current behaviors on the same input so a
 * later unification (lib/domain/streak.ts, Phase 4) can be verified to
 * reproduce each one exactly, per call site, rather than silently picking
 * a "more correct" answer and changing product behavior.
 */
describe("streak/heatmap streakRules divergence (pre-existing, preserved as-is)", () => {
  const rulesNoSprintCard: StreakRules = {
    challenge: true,
    checkin: true,
    sprintCard: false,
    practice: true,
  };

  const mapEntry = entry({ sprintCard: true });
  const map = new Map<string, StreakEntryDoc>([
    [TODAY, mapEntry],
    ["2026-07-14", entry({ sprintCard: true })],
  ]);

  it("streak.ts / overview.ts respect streakRules -> streak is 0", () => {
    expect(computeStreakData(map, rulesNoSprintCard, TODAY).streak).toBe(0);
    expect(computeOverviewStreakData(map, rulesNoSprintCard, TODAY).streak).toBe(0);
  });

  it("instructor.ts / calculate.ts ignore streakRules -> streak is 2", () => {
    expect(calcStreak(map, TODAY)).toBe(2);

    const arrayEntries = [
      { date: TODAY, sources: { challenge: false, checkin: false, sprintCard: true, practice: false } },
      { date: "2026-07-14", sources: { challenge: false, checkin: false, sprintCard: true, practice: false } },
    ];
    expect(getCurrentStreak(arrayEntries, TODAY)).toBe(2);
    expect(isActiveDay(arrayEntries[0])).toBe(true);
  });

  it("instructor.ts's heatmap level is non-zero even though the source is disabled for this course", () => {
    expect(heatmapLevel(map, TODAY)).toBeGreaterThan(0);
  });

  // Practice was added as a 4th source alongside challenge/checkin/sprintCard
  // and goes through the exact same rules-parameterized isActiveDay — so the
  // same divergence applies to it symmetrically.
  it("the same divergence holds for the practice source", () => {
    const rulesNoPractice: StreakRules = {
      challenge: true,
      checkin: true,
      sprintCard: true,
      practice: false,
    };
    const practiceMap = new Map<string, StreakEntryDoc>([
      [TODAY, entry({ practice: true })],
      ["2026-07-14", entry({ practice: true })],
    ]);

    expect(computeStreakData(practiceMap, rulesNoPractice, TODAY).streak).toBe(0);
    expect(computeOverviewStreakData(practiceMap, rulesNoPractice, TODAY).streak).toBe(0);
    expect(calcStreak(practiceMap, TODAY)).toBe(2);
  });
});
