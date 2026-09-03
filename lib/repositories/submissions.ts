import { Op } from "sequelize";
import { ChallengeSubmission } from "@/lib/db/models";
import type { ChallengeSubmissionDoc } from "@/lib/types";

function toDoc(row: ChallengeSubmission): ChallengeSubmissionDoc {
  return { challengeId: row.challengeId, code: row.code, submittedAt: row.submittedAt };
}

export async function findSubmissionForChallenge(
  studentId: string,
  courseId: string,
  challengeId: string
): Promise<{ id: string; data: ChallengeSubmissionDoc } | null> {
  const row = await ChallengeSubmission.findOne({ where: { studentId, courseId, challengeId } });
  return row ? { id: row.id, data: toDoc(row) } : null;
}

// Single atomic UPSERT via the (studentId, courseId, challengeId) unique constraint.
export async function upsertSubmission(
  studentId: string,
  courseId: string,
  challengeId: string,
  code: string
): Promise<void> {
  await ChallengeSubmission.upsert({ studentId, courseId, challengeId, code });
}

export async function countSubmissionsFull(
  studentId: string,
  courseId: string
): Promise<number> {
  return ChallengeSubmission.count({ where: { studentId, courseId } });
}

export async function countSubmissions(studentId: string, courseId: string): Promise<number> {
  return countSubmissionsFull(studentId, courseId);
}

export async function listRecentSubmissions(
  studentId: string,
  courseId: string,
  limit: number
): Promise<Array<{ id: string; data: ChallengeSubmissionDoc }>> {
  const rows = await ChallengeSubmission.findAll({
    where: { studentId, courseId },
    order: [["submittedAt", "DESC"]],
    limit,
  });
  return rows.map((row) => ({ id: row.id, data: toDoc(row) }));
}

export async function listSubmissionsPage(
  studentId: string,
  courseId: string,
  limit: number,
  cursor: Date | null
): Promise<Array<{ id: string; data: ChallengeSubmissionDoc }>> {
  const rows = await ChallengeSubmission.findAll({
    where: {
      studentId,
      courseId,
      ...(cursor ? { submittedAt: { [Op.lt]: cursor } } : {}),
    },
    order: [
      ["submittedAt", "DESC"],
      ["id", "DESC"],
    ],
    limit,
  });
  return rows.map((row) => ({ id: row.id, data: toDoc(row) }));
}
