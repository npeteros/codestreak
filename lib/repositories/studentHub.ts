import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

// /students/{uid}/courses/{courseId} — a denormalized "hub doc" letting a
// student's enrolled-course list be read without querying every course's
// enrollments subcollection.
export interface StudentHubDoc {
  courseId: string;
  courseName: string;
  timezone: string;
}

function hubCol(uid: string) {
  return adminDb.collection("students").doc(uid).collection("courses");
}

export async function listEnrolledCourses(
  uid: string
): Promise<Array<{ id: string; data: Partial<StudentHubDoc> }>> {
  const snap = await hubCol(uid).get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as Partial<StudentHubDoc> }));
}

export async function getFirstEnrolledCourse(
  uid: string
): Promise<{ id: string; data: Partial<StudentHubDoc> } | null> {
  const snap = await hubCol(uid).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() as Partial<StudentHubDoc> };
}

export async function createHubDoc(
  uid: string,
  courseId: string,
  data: { courseName: string; timezone: string }
): Promise<void> {
  await hubCol(uid)
    .doc(courseId)
    .set({
      courseId,
      courseName: data.courseName,
      timezone: data.timezone,
      joinedAt: FieldValue.serverTimestamp(),
    });
}

export async function deleteHubDocCascade(uid: string, courseId: string): Promise<void> {
  await adminDb.recursiveDelete(hubCol(uid).doc(courseId));
}
