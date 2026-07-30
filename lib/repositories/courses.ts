import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { CourseDoc } from "@/lib/firebase/types";

export async function getCourse(courseId: string): Promise<CourseDoc | null> {
  const snap = await adminDb.collection("courses").doc(courseId).get();
  return snap.exists ? (snap.data() as CourseDoc) : null;
}

export async function getCourseOwnedByInstructor(
  uid: string,
  courseId: string
): Promise<CourseDoc | null> {
  const course = await getCourse(courseId);
  if (!course || course.instructorId !== uid) return null;
  return course;
}

export async function listInstructorCourses(
  uid: string
): Promise<Array<{ id: string; data: CourseDoc }>> {
  const snap = await adminDb
    .collection("courses")
    .where("instructorId", "==", uid)
    .orderBy("createdAt", "desc")
    .get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as CourseDoc }));
}

export async function getCourseByInviteCode(
  inviteCode: string
): Promise<{ id: string; data: CourseDoc } | null> {
  const snap = await adminDb
    .collection("courses")
    .where("inviteCode", "==", inviteCode)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() as CourseDoc };
}

export async function isInviteCodeTaken(inviteCode: string): Promise<boolean> {
  const snap = await adminDb
    .collection("courses")
    .where("inviteCode", "==", inviteCode)
    .limit(1)
    .get();
  return !snap.empty;
}

export async function listPublicActiveCourses(): Promise<
  Array<{ id: string; data: CourseDoc }>
> {
  const snap = await adminDb
    .collection("courses")
    .where("isPublic", "==", true)
    .where("isArchived", "==", false)
    .get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as CourseDoc }));
}

export async function createCourse(data: {
  name: string;
  description: string;
  languageTag: string;
  timezone: string;
  inviteCode: string;
  instructorId: string;
  streakRules: { challenge: boolean; checkin: boolean; sprintCard: boolean; practice: boolean };
}): Promise<string> {
  const ref = await adminDb.collection("courses").add({
    name: data.name,
    description: data.description,
    languageTag: data.languageTag,
    timezone: data.timezone,
    inviteCode: data.inviteCode,
    instructorId: data.instructorId,
    streakRules: data.streakRules,
    isArchived: false,
    isPublic: false,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateCourse(
  courseId: string,
  updates: Partial<
    Pick<
      CourseDoc,
      "name" | "description" | "languageTag" | "timezone" | "streakRules" | "isPublic" | "isArchived"
    >
  >
): Promise<void> {
  await adminDb.collection("courses").doc(courseId).update(updates);
}

export async function deleteCourseCascade(courseId: string): Promise<void> {
  const enrollmentsSnap = await adminDb
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .get();

  await Promise.all(
    enrollmentsSnap.docs.map((doc) =>
      adminDb.recursiveDelete(
        adminDb.collection("students").doc(doc.id).collection("courses").doc(courseId)
      )
    )
  );

  await adminDb.recursiveDelete(adminDb.collection("courses").doc(courseId));
}
