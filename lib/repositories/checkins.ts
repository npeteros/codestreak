import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { CheckInDoc } from "@/lib/firebase/types";

function checkInsCol(studentId: string, courseId: string) {
  return adminDb
    .collection("students")
    .doc(studentId)
    .collection("courses")
    .doc(courseId)
    .collection("checkIns");
}

export async function hasCheckedInInRange(
  studentId: string,
  courseId: string,
  startOfDay: Date,
  endOfDay: Date
): Promise<boolean> {
  const snap = await checkInsCol(studentId, courseId)
    .where("createdAt", ">=", Timestamp.fromDate(startOfDay))
    .where("createdAt", "<", Timestamp.fromDate(endOfDay))
    .limit(1)
    .get();
  return !snap.empty;
}

export async function createCheckIn(
  studentId: string,
  courseId: string,
  note: string
): Promise<string> {
  const ref = await checkInsCol(studentId, courseId).add({
    note,
    courseId,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function countCheckInsSince(
  studentId: string,
  courseId: string,
  since: Date
): Promise<number> {
  const snap = await checkInsCol(studentId, courseId)
    .where("createdAt", ">=", Timestamp.fromDate(since))
    .get();
  return snap.size;
}

export async function listRecentCheckIns(
  studentId: string,
  courseId: string,
  limit: number
): Promise<Array<{ id: string; data: CheckInDoc }>> {
  const snap = await checkInsCol(studentId, courseId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as CheckInDoc }));
}

export async function countCheckIns(studentId: string, courseId: string): Promise<number> {
  const snap = await checkInsCol(studentId, courseId).count().get();
  return snap.data().count;
}

export async function listCheckInsPage(
  studentId: string,
  courseId: string,
  limit: number,
  cursor: Date | null
): Promise<Array<{ id: string; data: CheckInDoc }>> {
  let query = checkInsCol(studentId, courseId).orderBy("createdAt", "desc").limit(limit);
  if (cursor) query = query.startAfter(Timestamp.fromDate(cursor));
  const snap = await query.get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as CheckInDoc }));
}
