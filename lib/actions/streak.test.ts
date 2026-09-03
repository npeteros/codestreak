import { describe, it, expect } from "vitest";
import { computeStreakData } from "./streak.calc";
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

describe("computeStreakData (lib/actions/streak.ts)", () => {
  it("returns all-zero output for no entries", () => {
    const result = computeStreakData(mapFrom({}), ALL_RULES, TODAY, 2);
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
    expect(computeStreakData(map, ALL_RULES, TODAY).streak).toBe(3);
  });

  it("does not break the streak when today has no activity yet", () => {
    const map = mapFrom({
      "2026-07-14": entry({ checkin: true }),
      "2026-07-13": entry({ checkin: true }),
    });
    expect(computeStreakData(map, ALL_RULES, TODAY).streak).toBe(2);
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
    const result = computeStreakData(map, ALL_RULES, TODAY);
    expect(result.streak).toBe(3);
    expect(result.longest).toBe(5);
  });

  it("treats an entry doc with all sources false as inactive", () => {
    const map = mapFrom({ [TODAY]: entry() });
    const result = computeStreakData(map, ALL_RULES, TODAY);
    expect(result.streak).toBe(0);
    expect(result.activeDays).toBe(0);
  });

  it("respects streakRules: a disabled source does not count toward the streak", () => {
    const rules: StreakRules = { challenge: true, checkin: true, sprintCard: false, practice: true };
    const map = mapFrom({
      "2026-07-15": entry({ sprintCard: true }),
      "2026-07-14": entry({ sprintCard: true }),
    });
    const result = computeStreakData(map, rules, TODAY);
    expect(result.streak).toBe(0);
    expect(result.activeDays).toBe(0);
    expect(result.entries.find((e) => e.date === TODAY)?.level).toBe(0);
  });

  it("practice is a source like any other: counts toward the streak, and can be disabled via streakRules", () => {
    const map = mapFrom({
      "2026-07-15": entry({ practice: true }),
      "2026-07-14": entry({ practice: true }),
    });
    expect(computeStreakData(map, ALL_RULES, TODAY).streak).toBe(2);

    const rulesNoPractice: StreakRules = { challenge: true, checkin: true, sprintCard: true, practice: false };
    const result = computeStreakData(map, rulesNoPractice, TODAY);
    expect(result.streak).toBe(0);
    expect(result.activeDays).toBe(0);
  });

  it("buckets heatmap intensity as 0/2/3/4 (level 1 is never produced, and a 4th active source still caps at 4)", () => {
    const map = mapFrom({
      "2026-07-15": entry({ checkin: true }),
      "2026-07-14": entry({ checkin: true, challenge: true }),
      "2026-07-13": entry({ checkin: true, challenge: true, sprintCard: true }),
      "2026-07-12": entry(),
      "2026-07-11": entry({ checkin: true, challenge: true, sprintCard: true, practice: true }),
    });
    const result = computeStreakData(map, ALL_RULES, TODAY, 2);
    const level = (d: string) => result.entries.find((e) => e.date === d)?.level;
    expect(level("2026-07-15")).toBe(2);
    expect(level("2026-07-14")).toBe(3);
    expect(level("2026-07-13")).toBe(4);
    expect(level("2026-07-12")).toBe(0);
    expect(level("2026-07-11")).toBe(4);
  });

  it("produces weekCount*7 chronologically-ascending cells ending on today", () => {
    const result = computeStreakData(mapFrom({}), ALL_RULES, TODAY, 3);
    expect(result.entries).toHaveLength(21);
    expect(result.entries[0].date).toBe("2026-06-25");
    expect(result.entries[result.entries.length - 1].date).toBe(TODAY);
  });
});
