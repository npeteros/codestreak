"use server";

import type { ChallengeDoc, ChallengeDifficulty } from "@/lib/firebase/types";
import { recordStreakActivity } from "./streak";
import { getUid } from "@/lib/auth/session";
import { getCourse } from "@/lib/repositories/courses";
import {
  getChallenge,
  listPracticeChallengesPage as fetchPracticePage,
  listArchivedDailyChallengesPage as fetchDailyArchivePage,
  type BrowsableChallengeOrigin,
} from "@/lib/repositories/challenges";
import { createAttempt } from "@/lib/repositories/challengeAttempts";
import { getStartOfDayUTC } from "@/lib/domain/time";
import {
  mergePracticePage,
  INITIAL_PRACTICE_CURSOR,
  type BranchItem,
  type PracticeCursor,
  type PracticeSortDir,
} from "@/lib/domain/practiceMerge";

const PAGE_SIZE = 20;

// A challenge is part of the browsable Challenges module if it's a published
// practice challenge, or a published daily challenge scheduled before the
// cutoff (i.e. it's not today's/a future day's exclusive Daily Challenge).
// Re-derived server-side wherever a challengeId reaches an action, rather
// than trusted from the caller — practice challenges and archived daily
// challenges share the same collection/IDs as the still-exclusive Daily
// Challenge, so a challengeId alone doesn't prove browsability.
function isBrowsable(data: ChallengeDoc, cutoff: Date): boolean {
  if (data.isDraft) return false;
  if (data.kind === "PRACTICE") return true;
  return data.scheduledFor !== undefined && data.scheduledFor.toDate() < cutoff;
}

export interface PracticeChallengeSummary {
  id: string;
  title: string;
  difficulty: ChallengeDifficulty;
  topicTag: string;
  origin: BrowsableChallengeOrigin;
  createdAt: string;
}

interface MergeRow {
  doc: ChallengeDoc;
  origin: BrowsableChallengeOrigin;
}

function toBranchItems(
  rows: Array<{ id: string; data: ChallengeDoc }>,
  field: "createdAt" | "scheduledFor",
  origin: BrowsableChallengeOrigin
): BranchItem<MergeRow>[] {
  return rows.map(({ id, data }) => ({
    id,
    sortValue: (field === "createdAt" ? data.createdAt : data.scheduledFor!).toDate().toISOString(),
    data: { doc: data, origin },
  }));
}

export interface ListPracticeChallengesPageParams {
  cursor?: PracticeCursor | null;
  difficulty?: ChallengeDifficulty;
  sortDir?: PracticeSortDir;
}

export async function listPracticeChallengesPage(
  courseId: string,
  params: ListPracticeChallengesPageParams = {}
): Promise<
  | {
      success: true;
      items: PracticeChallengeSummary[];
      nextCursor: PracticeCursor;
      hasMore: boolean;
    }
  | { success: false; error: string }
> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(courseId);
  if (!course) return { success: false, error: "course_not_found" };

  const cutoff = getStartOfDayUTC(course.timezone);
  const sortDir = params.sortDir ?? "desc";
  const prevCursor = params.cursor ?? INITIAL_PRACTICE_CURSOR;

  const wantPractice = !prevCursor.practiceDone;
  const wantDaily = !prevCursor.dailyDone;

  const [practiceRows, dailyRows] = await Promise.all([
    wantPractice
      ? fetchPracticePage(courseId, {
          limit: PAGE_SIZE + 1,
          cursor: prevCursor.practice,
          isDraft: false,
          difficulty: params.difficulty,
          sortDir,
        })
      : Promise.resolve([]),
    wantDaily
      ? fetchDailyArchivePage(courseId, cutoff, {
          limit: PAGE_SIZE + 1,
          cursor: prevCursor.daily,
          difficulty: params.difficulty,
          sortDir,
        })
      : Promise.resolve([]),
  ]);

  const merged = mergePracticePage(
    PAGE_SIZE,
    sortDir,
    {
      items: toBranchItems(practiceRows, "createdAt", "PRACTICE"),
      requestedLimit: wantPractice ? PAGE_SIZE + 1 : 0,
    },
    {
      items: toBranchItems(dailyRows, "scheduledFor", "DAILY_ARCHIVE"),
      requestedLimit: wantDaily ? PAGE_SIZE + 1 : 0,
    },
    prevCursor
  );

  const items: PracticeChallengeSummary[] = merged.items.map(({ id, data }) => ({
    id,
    title: data.doc.title,
    difficulty: data.doc.difficulty,
    topicTag: data.doc.topicTag,
    origin: data.origin,
    createdAt: data.doc.createdAt.toDate().toISOString(),
  }));

  const hasMore = !merged.nextCursor.practiceDone || !merged.nextCursor.dailyDone;

  return { success: true, items, nextCursor: merged.nextCursor, hasMore };
}

export interface PracticeChallengeDetail {
  id: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  topicTag: string;
  starterCode: string;
}

export async function getPracticeChallenge(
  courseId: string,
  challengeId: string
): Promise<
  { success: true; challenge: PracticeChallengeDetail | null } | { success: false; error: string }
> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(courseId);
  if (!course) return { success: false, error: "course_not_found" };

  const data = await getChallenge(courseId, challengeId);
  const cutoff = getStartOfDayUTC(course.timezone);

  if (!data || !isBrowsable(data, cutoff)) {
    return { success: true, challenge: null };
  }

  return {
    success: true,
    challenge: {
      id: challengeId,
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      topicTag: data.topicTag,
      starterCode: data.starterCode,
    },
  };
}

export async function submitPracticeAttempt(
  courseId: string,
  challengeId: string,
  code: string
): Promise<{ success: true } | { success: false; error: string }> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(courseId);
  if (!course) return { success: false, error: "course_not_found" };

  const data = await getChallenge(courseId, challengeId);
  const cutoff = getStartOfDayUTC(course.timezone);
  if (!data || !isBrowsable(data, cutoff)) {
    return { success: false, error: "challenge_not_found" };
  }

  await createAttempt(uid, courseId, challengeId, code);

  // Practice shares the single streak counter with Daily Challenge/check-in/
  // sprint-card — same recordStreakActivity primitive, just a 4th source.
  recordStreakActivity({ studentId: uid, courseId, source: "practice" }).catch((err) =>
    console.error("[streak] recordStreakActivity failed:", err)
  );

  return { success: true };
}
