import { ChallengeAttempt } from "@/lib/db/models";

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
