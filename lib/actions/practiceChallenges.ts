"use server";

import type { ChallengeDifficulty, ChallengeDoc, SubmissionAiFeedback } from "@/lib/types";
import { recordStreakActivity } from "./streak";
import { getUid } from "@/lib/auth/session";
import { getCourse } from "@/lib/repositories/courses";
import {
  getChallenge,
  listPracticeChallengesPage as fetchPracticePage,
  listArchivedDailyChallengesPage as fetchDailyArchivePage,
  type BrowsableChallengeOrigin,
} from "@/lib/repositories/challenges";
import {
  createAttempt,
  findLatestAttempt,
  setAttemptFeedback,
} from "@/lib/repositories/challengeAttempts";
import { getStartOfDayUTC } from "@/lib/domain/time";
import { isChallengeBrowsable } from "@/lib/domain/visibility";
import { generateSubmissionFeedback } from "@/lib/services/openai/submissionFeedback";
import {
  mergePracticePage,
  INITIAL_PRACTICE_CURSOR,
  type BranchItem,
  type PracticeCursor,
  type PracticeSortDir,
} from "@/lib/domain/practiceMerge";

const PAGE_SIZE = 20;

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
    sortValue: (field === "createdAt" ? data.createdAt : data.scheduledFor!).toISOString(),
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
    createdAt: data.doc.createdAt.toISOString(),
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
  languageTag: string;
}

export async function getPracticeChallenge(
  courseId: string,
  challengeId: string
): Promise<
  | {
      success: true;
      challenge: PracticeChallengeDetail | null;
      feedback: SubmissionAiFeedback | null;
    }
  | { success: false; error: string }
> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(courseId);
  if (!course) return { success: false, error: "course_not_found" };

  const data = await getChallenge(courseId, challengeId);
  const cutoff = getStartOfDayUTC(course.timezone);

  if (!data || !isChallengeBrowsable(data, cutoff)) {
    return { success: true, challenge: null, feedback: null };
  }

  const latestAttempt = await findLatestAttempt(uid, courseId, challengeId);

  return {
    success: true,
    challenge: {
      id: challengeId,
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      topicTag: data.topicTag,
      starterCode: data.starterCode,
      languageTag: course.languageTag,
    },
    feedback: latestAttempt?.data.aiVerdict
      ? {
          verdict: latestAttempt.data.aiVerdict,
          celebrate: latestAttempt.data.aiCelebrate ?? "",
          improve: latestAttempt.data.aiImprove ?? "",
        }
      : null,
  };
}

export async function submitPracticeAttempt(
  courseId: string,
  challengeId: string,
  code: string
): Promise<
  { success: true; feedback: SubmissionAiFeedback } | { success: false; error: string }
> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(courseId);
  if (!course) return { success: false, error: "course_not_found" };

  const data = await getChallenge(courseId, challengeId);
  const cutoff = getStartOfDayUTC(course.timezone);
  if (!data || !isChallengeBrowsable(data, cutoff)) {
    return { success: false, error: "challenge_not_found" };
  }

  const attemptId = await createAttempt(uid, courseId, challengeId, code);

  // Practice shares the single streak counter with Daily Challenge/check-in/
  // sprint-card — same recordStreakActivity primitive, just a 4th source.
  // Fires unconditionally, unaffected by the AI verdict computed below.
  recordStreakActivity({ studentId: uid, courseId, source: "practice" }).catch((err) =>
    console.error("[streak] recordStreakActivity failed:", err)
  );

  let feedback: SubmissionAiFeedback;
  try {
    feedback = await generateSubmissionFeedback({
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      topicTag: data.topicTag,
      code,
    });
  } catch (err) {
    console.error("[ai] generateSubmissionFeedback failed:", err);
    feedback = { verdict: "UNABLE_TO_ASSESS", celebrate: "", improve: "" };
  }
  await setAttemptFeedback(attemptId, feedback);

  return { success: true, feedback };
}
