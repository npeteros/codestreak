// Merges two independently cursor-paginated Firestore branches (practice
// challenges + archived daily challenges) into one globally time-ordered
// page, without ever fetching either branch in full. See docs/ARCHITECTURE.md
// / AGENTS.md for why the Practice module's list is a merge of two sources in
// the first place. Pure — no Firestore access here; lib/repositories/challenges.ts
// does the actual fetching, this just decides how to interleave and where each
// branch's cursor should resume next.
//
// sortValue must be an ISO 8601 string (Date#toISOString()) so plain string
// comparison sorts correctly — createdAt for the practice branch,
// scheduledFor for the archived-daily branch (that branch can't be ordered by
// createdAt: it carries a `scheduledFor < cutoff` range filter, and Firestore
// requires the first orderBy to match a range-filtered field).

export type PracticeSortDir = "desc" | "asc";
export type PracticeBranch = "practice" | "daily";

export interface BranchItem<T> {
  id: string;
  sortValue: string;
  data: T;
}

// `requestedLimit` is 0 when this branch wasn't queried this round (already
// marked done, or excluded by an origin filter) — `items` is `[]` in that case.
export interface BranchBatch<T> {
  items: BranchItem<T>[];
  requestedLimit: number;
}

export interface PracticeCursor {
  practice: string | null;
  daily: string | null;
  practiceDone: boolean;
  dailyDone: boolean;
}

export const INITIAL_PRACTICE_CURSOR: PracticeCursor = {
  practice: null,
  daily: null,
  practiceDone: false,
  dailyDone: false,
};

export interface MergedPracticePage<T> {
  items: BranchItem<T>[];
  nextCursor: PracticeCursor;
}

export function mergePracticePage<T>(
  pageSize: number,
  sortDir: PracticeSortDir,
  practice: BranchBatch<T>,
  daily: BranchBatch<T>,
  prevCursor: PracticeCursor
): MergedPracticePage<T> {
  const candidates: Array<BranchItem<T> & { branch: PracticeBranch }> = [
    ...practice.items.map((item) => ({ ...item, branch: "practice" as const })),
    ...daily.items.map((item) => ({ ...item, branch: "daily" as const })),
  ];

  candidates.sort((a, b) => {
    if (a.sortValue === b.sortValue) return 0;
    const cmp = a.sortValue < b.sortValue ? -1 : 1;
    return sortDir === "desc" ? -cmp : cmp;
  });

  const taken = candidates.slice(0, pageSize);

  const lastTaken = (branch: PracticeBranch) => {
    for (let i = taken.length - 1; i >= 0; i--) {
      if (taken[i].branch === branch) return taken[i].sortValue;
    }
    return null;
  };

  const lastPracticeTaken = lastTaken("practice");
  const lastDailyTaken = lastTaken("daily");

  // A branch is only "done" once Firestore has confirmed nothing lies beyond
  // its last fetch (fetched fewer than requested) AND every item from that
  // fetch actually made it into `taken` this round — a naturally-exhausted
  // fetch that still has leftover (unconsumed) items must stay non-done, or
  // those leftovers would never be queried again and would be silently lost.
  const practiceConsumed = taken.filter((c) => c.branch === "practice").length;
  const dailyConsumed = taken.filter((c) => c.branch === "daily").length;

  return {
    items: taken.map((item) => ({ id: item.id, sortValue: item.sortValue, data: item.data })),
    nextCursor: {
      practice: lastPracticeTaken ?? prevCursor.practice,
      daily: lastDailyTaken ?? prevCursor.daily,
      practiceDone:
        practice.requestedLimit > 0
          ? practice.items.length < practice.requestedLimit && practiceConsumed === practice.items.length
          : prevCursor.practiceDone,
      dailyDone:
        daily.requestedLimit > 0
          ? daily.items.length < daily.requestedLimit && dailyConsumed === daily.items.length
          : prevCursor.dailyDone,
    },
  };
}
