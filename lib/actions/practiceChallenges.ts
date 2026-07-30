"use server";

import type { ChallengeDoc, ChallengeDifficulty } from "@/lib/firebase/types";
import { recordStreakActivity } from "./streak";
import { getUid } from "@/lib/auth/session";
import { getCourse } from "@/lib/repositories/courses";
import {
  getChallenge,
  listBrowsableChallenges,
  type BrowsableChallengeOrigin,
} from "@/lib/repositories/challenges";
import { createAttempt } from "@/lib/repositories/challengeAttempts";
import { getStartOfDayUTC } from "@/lib/domain/time";

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
}

export async function listPracticeChallenges(
  courseId: string
): Promise<
  { success: true; challenges: PracticeChallengeSummary[] } | { success: false; error: string }
> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(courseId);
  if (!course) return { success: false, error: "course_not_found" };

  const cutoff = getStartOfDayUTC(course.timezone);
  const rows = await listBrowsableChallenges(courseId, cutoff);

  return {
    success: true,
    challenges: rows.map(({ id, data, origin }) => ({
      id,
      title: data.title,
      difficulty: data.difficulty,
      topicTag: data.topicTag,
      origin,
    })),
  };
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
