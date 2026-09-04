"use server";

import type { SubmissionAiFeedback } from "@/lib/types";
import { recordStreakActivity } from "@/lib/actions/streak";
import { triggerJournalEntry } from "@/lib/actions/journal";
import { getUid } from "@/lib/auth/session";
import { getCourse } from "@/lib/repositories/courses";
import { getChallenge, getScheduledChallenge } from "@/lib/repositories/challenges";
import {
  findSubmissionForChallenge,
  setSubmissionFeedback,
  upsertSubmission,
} from "@/lib/repositories/submissions";
import { getStartOfDayUTC } from "@/lib/domain/time";
import { generateSubmissionFeedback } from "@/lib/services/openai/submissionFeedback";

export async function getTodayChallenge(courseId: string) {
  const uid = await getUid();
  if (!uid) return { success: false as const, error: "unauthenticated" as const };

  const course = await getCourse(courseId);
  if (!course) return { success: false as const, error: "course_not_found" as const };
  const { timezone } = course;

  const startOfDay = getStartOfDayUTC(timezone);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const scheduled = await getScheduledChallenge(courseId, startOfDay, endOfDay);

  if (!scheduled) {
    return {
      success: true as const,
      challenge: null,
      alreadySubmitted: false,
      submittedCode: null,
      feedback: null,
    };
  }

  const { id, data } = scheduled;

  const submission = await findSubmissionForChallenge(uid, courseId, id);

  return {
    success: true as const,
    challenge: {
      id,
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      topicTag: data.topicTag,
      starterCode: data.starterCode,
    },
    alreadySubmitted: submission !== null,
    submittedCode: submission?.data.code ?? null,
    feedback: submission?.data.aiVerdict
      ? {
          verdict: submission.data.aiVerdict,
          celebrate: submission.data.aiCelebrate ?? "",
          improve: submission.data.aiImprove ?? "",
        }
      : null,
  };
}

export async function submitChallenge(
  courseId: string,
  challengeId: string,
  code: string
) {
  const uid = await getUid();
  if (!uid) return { success: false as const, error: "unauthenticated" as const };

  const challenge = await getChallenge(courseId, challengeId);
  if (!challenge) return { success: false as const, error: "challenge_not_found" as const };

  await upsertSubmission(uid, courseId, challengeId, code);

  // Fires unconditionally, not gated on the AI verdict computed below.
  recordStreakActivity({ studentId: uid, courseId, source: "challenge" }).catch(
    (err) => console.error("[streak] recordStreakActivity failed:", err)
  );

  let feedback: SubmissionAiFeedback;
  try {
    feedback = await generateSubmissionFeedback({
      title: challenge.title,
      description: challenge.description,
      difficulty: challenge.difficulty,
      topicTag: challenge.topicTag,
      code,
    });
  } catch (err) {
    console.error("[ai] generateSubmissionFeedback failed:", err);
    feedback = { verdict: "UNABLE_TO_ASSESS", celebrate: "", improve: "" };
  }
  await setSubmissionFeedback(uid, courseId, challengeId, feedback);

  triggerJournalEntry(uid, courseId, {
    triggerType: "CHALLENGE",
    title: challenge.title,
    difficulty: challenge.difficulty,
    topicTag: challenge.topicTag,
    code,
  }).catch((err) => console.error("[journal] triggerJournalEntry failed:", err));

  return { success: true as const, feedback };
}
