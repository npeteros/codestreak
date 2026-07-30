import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

function attemptsCol(studentId: string, courseId: string) {
  return adminDb
    .collection("students")
    .doc(studentId)
    .collection("courses")
    .doc(courseId)
    .collection("challengeAttempts");
}

// Always creates a new doc — unlike submissions.ts's upsertSubmission, every
// practice attempt is logged separately to support unlimited retakes.
export async function createAttempt(
  studentId: string,
  courseId: string,
  challengeId: string,
  code: string
): Promise<string> {
  const ref = await attemptsCol(studentId, courseId).add({
    challengeId,
    code,
    submittedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function countAttemptsForChallenge(
  studentId: string,
  courseId: string,
  challengeId: string
): Promise<number> {
  const snap = await attemptsCol(studentId, courseId)
    .where("challengeId", "==", challengeId)
    .count()
    .get();
  return snap.data().count;
}
