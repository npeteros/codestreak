import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";

export async function isEnrolled(courseId: string, studentId: string): Promise<boolean> {
  const snap = await adminDb
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .doc(studentId)
    .get();
  return snap.exists;
}

export async function enrollStudent(courseId: string, studentId: string): Promise<void> {
  await adminDb
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .doc(studentId)
    .set({ studentId, joinedAt: FieldValue.serverTimestamp() });
}

export async function unenrollStudent(courseId: string, studentId: string): Promise<void> {
  await adminDb
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .doc(studentId)
    .delete();
}

export async function listEnrolledStudentIds(courseId: string): Promise<string[]> {
  const snap = await adminDb
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .get();
  return snap.docs.map((d) => d.id);
}

export async function countEnrollments(courseId: string): Promise<number> {
  const snap = await adminDb
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .get();
  return snap.size;
}
