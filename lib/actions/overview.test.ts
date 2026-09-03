import { describe, it, expect } from "vitest";
import { computeOverviewStreakData } from "./overview.calc";
import type { StreakEntryDoc, StreakRules } from "@/lib/types";

const TODAY = "2026-07-15";
const ALL_RULES: StreakRules = { challenge: true, checkin: true, sprintCard: true, practice: true };

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

function mapFrom(entries: Record<string, StreakEntryDoc>): Map<string, StreakEntryDoc> {
  return new Map(Object.entries(entries));
}

// computeOverviewStreakData is a byte-for-byte twin of computeStreakData
// (lib/actions/streak.ts) — this file pins the same scenarios independently
// so Phase 4's merge of the two can be verified against both test suites.
describe("computeOverviewStreakData (lib/actions/overview.ts)", () => {
  it("returns all-zero output for no entries", () => {
    const result = computeOverviewStreakData(mapFrom({}), ALL_RULES, TODAY, 2);
    expect(result.streak).toBe(0);
    expect(result.longest).toBe(0);
    expect(result.activeDays).toBe(0);
    expect(result.entries).toHaveLength(14);
    expect(result.entries.every((e) => e.level === 0)).toBe(true);
  });

  it("counts a simple consecutive streak including today", () => {
    const map = mapFrom({
      "2026-07-15": entry({ checkin: true }),
      "2026-07-14": entry({ checkin: true }),
      "2026-07-13": entry({ checkin: true }),
    });
    expect(computeOverviewStreakData(map, ALL_RULES, TODAY).streak).toBe(3);
  });

  it("does not break the streak when today has no activity yet", () => {
    const map = mapFrom({
      "2026-07-14": entry({ checkin: true }),
      "2026-07-13": entry({ checkin: true }),
    });
    expect(computeOverviewStreakData(map, ALL_RULES, TODAY).streak).toBe(2);
  });

  it("distinguishes current streak from longest streak across a gap", () => {
    const map = mapFrom({
      "2026-07-15": entry({ checkin: true }),
      "2026-07-14": entry({ checkin: true }),
      "2026-07-13": entry({ checkin: true }),
      "2026-07-05": entry({ checkin: true }),
      "2026-07-04": entry({ checkin: true }),
      "2026-07-03": entry({ checkin: true }),
      "2026-07-02": entry({ checkin: true }),
      "2026-07-01": entry({ checkin: true }),
    });
    const result = computeOverviewStreakData(map, ALL_RULES, TODAY);
    expect(result.streak).toBe(3);
    expect(result.longest).toBe(5);
  });

  it("treats an entry doc with all sources false as inactive", () => {
    const map = mapFrom({ [TODAY]: entry() });
    const result = computeOverviewStreakData(map, ALL_RULES, TODAY);
    expect(result.streak).toBe(0);
    expect(result.activeDays).toBe(0);
  });

  it("respects streakRules: a disabled source does not count toward the streak", () => {
    const rules: StreakRules = { challenge: true, checkin: true, sprintCard: false, practice: true };
    const map = mapFrom({
      "2026-07-15": entry({ sprintCard: true }),
      "2026-07-14": entry({ sprintCard: true }),
    });
    const result = computeOverviewStreakData(map, rules, TODAY);
    expect(result.streak).toBe(0);
    expect(result.activeDays).toBe(0);
    expect(result.entries.find((e) => e.date === TODAY)?.level).toBe(0);
  });

  it("practice is a source like any other: counts toward the streak, and can be disabled via streakRules", () => {
    const map = mapFrom({
      "2026-07-15": entry({ practice: true }),
      "2026-07-14": entry({ practice: true }),
    });
    expect(computeOverviewStreakData(map, ALL_RULES, TODAY).streak).toBe(2);

    const rulesNoPractice: StreakRules = { challenge: true, checkin: true, sprintCard: true, practice: false };
    const result = computeOverviewStreakData(map, rulesNoPractice, TODAY);
    expect(result.streak).toBe(0);
    expect(result.activeDays).toBe(0);
  });

  it("buckets heatmap intensity as 0/2/3/4 (level 1 is never produced)", () => {
    const map = mapFrom({
      "2026-07-15": entry({ checkin: true }),
      "2026-07-14": entry({ checkin: true, challenge: true }),
      "2026-07-13": entry({ checkin: true, challenge: true, sprintCard: true }),
      "2026-07-12": entry(),
    });
    const result = computeOverviewStreakData(map, ALL_RULES, TODAY, 2);
    const level = (d: string) => result.entries.find((e) => e.date === d)?.level;
    expect(level("2026-07-15")).toBe(2);
    expect(level("2026-07-14")).toBe(3);
    expect(level("2026-07-13")).toBe(4);
    expect(level("2026-07-12")).toBe(0);
  });

  it("produces weekCount*7 chronologically-ascending cells ending on today", () => {
    const result = computeOverviewStreakData(mapFrom({}), ALL_RULES, TODAY, 3);
    expect(result.entries).toHaveLength(21);
    expect(result.entries[0].date).toBe("2026-06-25");
    expect(result.entries[result.entries.length - 1].date).toBe(TODAY);
  });
});
