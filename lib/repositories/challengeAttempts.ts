import { ChallengeAttempt } from "@/lib/db/models";
import type { ChallengeAttemptDoc, SubmissionAiFeedback } from "@/lib/types";

function toDoc(row: ChallengeAttempt): ChallengeAttemptDoc {
  return {
    challengeId: row.challengeId,
    code: row.code,
    submittedAt: row.submittedAt,
    aiVerdict: row.aiVerdict,
    aiCelebrate: row.aiCelebrate,
    aiImprove: row.aiImprove,
    aiFeedbackAt: row.aiFeedbackAt,
  };
}

// Always creates a new row — unlimited retakes, unlike submissions.ts's upsert.
export async function createAttempt(
  studentId: string,
  courseId: string,
  challengeId: string,
  code: string
): Promise<string> {
  const row = await ChallengeAttempt.create({ studentId, courseId, challengeId, code });
  return row.id;
}

export async function countAttemptsForChallenge(
  studentId: string,
  courseId: string,
  challengeId: string
): Promise<number> {
  return ChallengeAttempt.count({ where: { studentId, courseId, challengeId } });
}

export async function findLatestAttempt(
  studentId: string,
  courseId: string,
  challengeId: string
): Promise<{ id: string; data: ChallengeAttemptDoc } | null> {
  const row = await ChallengeAttempt.findOne({
    where: { studentId, courseId, challengeId },
    order: [["submittedAt", "DESC"]],
  });
  return row ? { id: row.id, data: toDoc(row) } : null;
}

export async function setAttemptFeedback(
  attemptId: string,
  feedback: SubmissionAiFeedback
): Promise<void> {
  await ChallengeAttempt.update(
    {
      aiVerdict: feedback.verdict,
      aiCelebrate: feedback.celebrate,
      aiImprove: feedback.improve,
      aiFeedbackAt: new Date(),
    },
    { where: { id: attemptId } }
  );
}
