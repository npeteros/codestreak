import { describe, it, expect } from "vitest";
import { mergePracticePage, INITIAL_PRACTICE_CURSOR, type BranchBatch } from "./practiceMerge";

function batch(sortValues: string[], requestedLimit: number): BranchBatch<null> {
  return {
    items: sortValues.map((sortValue) => ({ id: sortValue, sortValue, data: null })),
    requestedLimit,
  };
}

describe("mergePracticePage", () => {
  it("interleaves an even split across both branches, newest first", () => {
    const practice = batch(["10", "08", "06", "04"], 4); // pageSize(3) + 1
    const daily = batch(["09", "07", "05", "03"], 4);

    const page = mergePracticePage(3, "desc", practice, daily, INITIAL_PRACTICE_CURSOR);

    expect(page.items.map((i) => i.id)).toEqual(["10", "09", "08"]);
    expect(page.nextCursor).toEqual({
      practice: "08",
      daily: "09",
      practiceDone: false,
      dailyDone: false,
    });
  });

  it("sorts ascending (oldest first) when requested", () => {
    const practice = batch(["04", "06", "08"], 4);
    const daily = batch(["03", "05", "07"], 4);

    const page = mergePracticePage(3, "asc", practice, daily, INITIAL_PRACTICE_CURSOR);

    expect(page.items.map((i) => i.id)).toEqual(["03", "04", "05"]);
    expect(page.nextCursor.practice).toBe("04");
    expect(page.nextCursor.daily).toBe("05");
  });

  it("does not mark a branch done while it still has unconsumed leftovers from its own fetch", () => {
    // daily's fetch (2 items) is naturally exhausted (2 < requestedLimit 3),
    // but only "09" gets consumed into this page — "07" is left over, so
    // dailyDone must stay false or "07" would never be fetched again.
    const practice = batch(["10", "08", "06"], 3); // pageSize(2) + 1
    const daily = batch(["09", "07"], 3);

    const page = mergePracticePage(2, "desc", practice, daily, INITIAL_PRACTICE_CURSOR);

    expect(page.items.map((i) => i.id)).toEqual(["10", "09"]);
    expect(page.nextCursor.dailyDone).toBe(false);
    expect(page.nextCursor.daily).toBe("09");
  });

  it("marks a branch done once its fetch is both short and fully consumed", () => {
    const practice = batch(["06"], 3);
    const daily = batch([], 3);

    const page = mergePracticePage(2, "desc", practice, daily, {
      practice: "08",
      daily: "07",
      practiceDone: false,
      dailyDone: true,
    });

    expect(page.items.map((i) => i.id)).toEqual(["06"]);
    expect(page.nextCursor.practiceDone).toBe(true);
    // dailyDone was already true and daily wasn't re-queried (requestedLimit 0
    // implied by an empty batch here) — carried forward unchanged.
    expect(page.nextCursor.dailyDone).toBe(true);
    expect(page.nextCursor.daily).toBe("07");
  });

  it("carries a skipped branch's cursor and done flag forward unchanged (origin filter)", () => {
    const practice = batch(["10", "08"], 3);
    const daily: BranchBatch<null> = { items: [], requestedLimit: 0 };

    const page = mergePracticePage(2, "desc", practice, daily, {
      practice: null,
      daily: null,
      practiceDone: false,
      dailyDone: false,
    });

    expect(page.items.map((i) => i.id)).toEqual(["10", "08"]);
    expect(page.nextCursor.daily).toBeNull();
    expect(page.nextCursor.dailyDone).toBe(false);
  });

  it("reassembles the full ordered sequence across consecutive pages with no loss or duplication", () => {
    // Round 1: fetch both branches from scratch.
    const round1 = mergePracticePage(
      2,
      "desc",
      batch(["10", "08", "06"], 3),
      batch(["09", "07"], 3),
      INITIAL_PRACTICE_CURSOR
    );
    expect(round1.items.map((i) => i.id)).toEqual(["10", "09"]);
    expect(round1.nextCursor.practiceDone).toBe(false);
    expect(round1.nextCursor.dailyDone).toBe(false);

    // Round 2: practice resumes after "10" (returns the rest, exhausted);
    // daily resumes after "09" (returns leftover "07", exhausted+consumed).
    const round2 = mergePracticePage(
      2,
      "desc",
      batch(["08", "06"], 3),
      batch(["07"], 3),
      round1.nextCursor
    );
    expect(round2.items.map((i) => i.id)).toEqual(["08", "07"]);
    expect(round2.nextCursor.practiceDone).toBe(false); // "06" still unconsumed
    expect(round2.nextCursor.dailyDone).toBe(true);

    // Round 3: only practice is queried (daily already done); "06" is the
    // last remaining item.
    const round3 = mergePracticePage(
      2,
      "desc",
      batch(["06"], 3),
      { items: [], requestedLimit: 0 },
      round2.nextCursor
    );
    expect(round3.items.map((i) => i.id)).toEqual(["06"]);
    expect(round3.nextCursor.practiceDone).toBe(true);
    expect(round3.nextCursor.dailyDone).toBe(true);

    const all = [...round1.items, ...round2.items, ...round3.items].map((i) => i.id);
    expect(all).toEqual(["10", "09", "08", "07", "06"]);
  });
});
