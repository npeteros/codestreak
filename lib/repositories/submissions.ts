import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { ChallengeSubmissionDoc } from "@/lib/firebase/types";

function submissionsCol(studentId: string, courseId: string) {
  return adminDb
    .collection("students")
    .doc(studentId)
    .collection("courses")
    .doc(courseId)
    .collection("challengeSubmissions");
}

export async function findSubmissionForChallenge(
  studentId: string,
  courseId: string,
  challengeId: string
): Promise<{ id: string; data: ChallengeSubmissionDoc } | null> {
  const snap = await submissionsCol(studentId, courseId)
    .where("challengeId", "==", challengeId)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() as ChallengeSubmissionDoc };
}

// Updates the existing submission's code if one exists for this challenge,
// otherwise creates a new submission (stamping submittedAt only on create).
export async function upsertSubmission(
  studentId: string,
  courseId: string,
  challengeId: string,
  code: string
): Promise<void> {
  const existing = await submissionsCol(studentId, courseId)
    .where("challengeId", "==", challengeId)
    .limit(1)
    .get();

  if (!existing.empty) {
    await existing.docs[0].ref.update({ code });
    return;
  }

  await submissionsCol(studentId, courseId).add({
    challengeId,
    code,
    submittedAt: FieldValue.serverTimestamp(),
  });
}

export async function countSubmissionsFull(
  studentId: string,
  courseId: string
): Promise<number> {
  const snap = await submissionsCol(studentId, courseId).count().get();
  return snap.data().count;
}

export async function countSubmissions(studentId: string, courseId: string): Promise<number> {
  const snap = await submissionsCol(studentId, courseId).count().get();
  return snap.data().count;
}

export async function listRecentSubmissions(
  studentId: string,
  courseId: string,
  limit: number
): Promise<Array<{ id: string; data: ChallengeSubmissionDoc }>> {
  const snap = await submissionsCol(studentId, courseId)
    .orderBy("submittedAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as ChallengeSubmissionDoc }));
}

export async function listSubmissionsPage(
  studentId: string,
  courseId: string,
  limit: number,
  cursor: Date | null
): Promise<Array<{ id: string; data: ChallengeSubmissionDoc }>> {
  let query = submissionsCol(studentId, courseId)
    .orderBy("submittedAt", "desc")
    .limit(limit);
  if (cursor) query = query.startAfter(Timestamp.fromDate(cursor));
  const snap = await query.get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as ChallengeSubmissionDoc }));
}
