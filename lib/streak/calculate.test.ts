import { describe, it, expect } from "vitest";
import {
  isActiveDay,
  getCurrentStreak,
  getLongestStreak,
  getTotalActiveDays,
  getHeatmapGrid,
  type StreakEntry,
} from "./calculate";

const TODAY = "2026-07-15";

function e(date: string, sources: Partial<StreakEntry["sources"]> = {}): StreakEntry {
  return {
    date,
    sources: {
      challenge: sources.challenge ?? false,
      checkin: sources.checkin ?? false,
      sprintCard: sources.sprintCard ?? false,
    },
  };
}

// This module has no live route (see lib/actions/streak.ts's dead getStreakEntries()
// and components/student/{StreakSummary,ActivityHeatmap}.tsx) but is kept and
// characterized so a future migration onto lib/domain/streak.ts (Phase 4) can be
// verified to reproduce it exactly.
describe("lib/streak/calculate.ts (unmounted — feeds StreakSummary/ActivityHeatmap)", () => {
  it("is streakRules-blind: any single source makes a day active", () => {
    expect(isActiveDay(e(TODAY, { sprintCard: true }))).toBe(true);
    expect(isActiveDay(e(TODAY))).toBe(false);
  });

  it("getCurrentStreak: no entries -> 0", () => {
    expect(getCurrentStreak([], TODAY)).toBe(0);
  });

  it("getCurrentStreak: does not break when today has no activity yet", () => {
    const entries = [e("2026-07-14", { checkin: true }), e("2026-07-13", { checkin: true })];
    expect(getCurrentStreak(entries, TODAY)).toBe(2);
  });

  it("getLongestStreak vs getCurrentStreak diverge across a gap", () => {
    const entries = [
      e("2026-07-15", { checkin: true }),
      e("2026-07-14", { checkin: true }),
      e("2026-07-13", { checkin: true }),
      e("2026-07-05", { checkin: true }),
      e("2026-07-04", { checkin: true }),
      e("2026-07-03", { checkin: true }),
      e("2026-07-02", { checkin: true }),
      e("2026-07-01", { checkin: true }),
    ];
    expect(getCurrentStreak(entries, TODAY)).toBe(3);
    expect(getLongestStreak(entries)).toBe(5);
  });

  it("getTotalActiveDays counts only entries with at least one active source", () => {
    const entries = [e("2026-07-15", { checkin: true }), e("2026-07-14")];
    expect(getTotalActiveDays(entries)).toBe(1);
  });

  it("getHeatmapGrid returns exactly 365 oldest-first cells; missing days are inactive with null sources", () => {
    const entries = [e(TODAY, { checkin: true })];
    const cells = getHeatmapGrid(entries, TODAY);
    expect(cells).toHaveLength(365);
    expect(cells[0].date).toBe("2025-07-16");
    expect(cells[364].date).toBe(TODAY);
    expect(cells[364].active).toBe(true);
    expect(cells[0].active).toBe(false);
    expect(cells[0].sources).toBeNull();
  });
});
