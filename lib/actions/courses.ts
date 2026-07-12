"use server";

import { FieldValue } from "firebase-admin/firestore";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { UserDoc, CourseDoc } from "@/lib/firebase/types";

const COOKIE = "codestreak_session";

async function getVerifiedInstructor(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE);
  if (!session?.value) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(session.value, true);
    const uid = decoded.uid;
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) return null;
    if ((userSnap.data() as UserDoc).role !== "INSTRUCTOR") return null;
    return uid;
  } catch {
    return null;
  }
}

function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

export async function createCourse(data: {
  name: string;
  description: string;
  languageTag: string;
  timezone: string;
  streakRules: { challenge: boolean; checkin: boolean; sprintCard: boolean };
}): Promise<{ success: boolean; courseId?: string; error?: string }> {
  const uid = await getVerifiedInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  if (!data.name.trim()) return { success: false, error: "missing_name" };

  let inviteCode = generateInviteCode();
  // Ensure uniqueness (collision is extremely rare but guard anyway)
  for (let i = 0; i < 5; i++) {
    const existing = await adminDb
      .collection("courses")
      .where("inviteCode", "==", inviteCode)
      .limit(1)
      .get();
    if (existing.empty) break;
    inviteCode = generateInviteCode();
  }

  const ref = await adminDb.collection("courses").add({
    name: data.name.trim(),
    description: data.description.trim(),
    languageTag: data.languageTag,
    timezone: data.timezone,
    inviteCode,
    instructorId: uid,
    streakRules: data.streakRules,
    isArchived: false,
    isPublic: false,
    createdAt: FieldValue.serverTimestamp(),
  });

  return { success: true, courseId: ref.id };
}

export async function getCourseByInviteCode(inviteCode: string) {
  const snap = await adminDb
    .collection("courses")
    .where("inviteCode", "==", inviteCode.toUpperCase())
    .limit(1)
    .get();
  if (snap.empty) return { success: false as const, error: "not_found" };
  const doc = snap.docs[0];
  const data = doc.data() as CourseDoc;
  return {
    success: true as const,
    courseId: doc.id,
    name: data.name,
    description: data.description,
    languageTag: data.languageTag,
  };
}

export async function enrollStudent(courseId: string, studentId: string) {
  await adminDb
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .doc(studentId)
    .set({ studentId, joinedAt: FieldValue.serverTimestamp() });
  return { success: true as const };
}

async function getVerifiedStudent(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE);
  if (!session?.value) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(session.value, true);
    const uid = decoded.uid;
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) return null;
    if ((userSnap.data() as UserDoc).role !== "STUDENT") return null;
    return uid;
  } catch {
    return null;
  }
}

export async function getJoinPageData(inviteCode: string): Promise<
  | { success: false; error: "not_found" }
  | {
      success: true;
      course: { courseId: string; name: string; description: string; languageTag: string };
      authState: "unauthenticated" | "instructor" | "enrolled" | "not_enrolled";
    }
> {
  const snap = await adminDb
    .collection("courses")
    .where("inviteCode", "==", inviteCode.toUpperCase())
    .limit(1)
    .get();

  if (snap.empty) return { success: false, error: "not_found" };

  const doc = snap.docs[0];
  const data = doc.data() as CourseDoc;
  const course = {
    courseId: doc.id,
    name: data.name,
    description: data.description,
    languageTag: data.languageTag,
  };

  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE);
  if (!session?.value) return { success: true, course, authState: "unauthenticated" };

  let uid: string;
  let role: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(session.value, true);
    uid = decoded.uid;
    const userSnap = await adminDb.collection("users").doc(uid).get();
    if (!userSnap.exists) return { success: true, course, authState: "unauthenticated" };
    role = (userSnap.data() as UserDoc).role;
  } catch {
    return { success: true, course, authState: "unauthenticated" };
  }

  if (role !== "STUDENT") return { success: true, course, authState: "instructor" };

  const enrollSnap = await adminDb
    .collection("courses")
    .doc(doc.id)
    .collection("enrollments")
    .doc(uid)
    .get();

  return {
    success: true,
    course,
    authState: enrollSnap.exists ? "enrolled" : "not_enrolled",
  };
}

export async function joinCourse(
  inviteCode: string
): Promise<{ success: boolean; error?: string }> {
  const uid = await getVerifiedStudent();
  if (!uid) return { success: false, error: "unauthenticated" };

  const snap = await adminDb
    .collection("courses")
    .where("inviteCode", "==", inviteCode.toUpperCase())
    .limit(1)
    .get();

  if (snap.empty) return { success: false, error: "not_found" };

  const doc = snap.docs[0];
  const courseId = doc.id;
  const courseData = doc.data() as CourseDoc;

  const enrollSnap = await adminDb
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .doc(uid)
    .get();

  if (!enrollSnap.exists) {
    await Promise.all([
      enrollStudent(courseId, uid),
      // Write student hub doc so the dashboard can list enrolled courses
      adminDb
        .collection("students")
        .doc(uid)
        .collection("courses")
        .doc(courseId)
        .set({
          courseId,
          courseName: courseData.name,
          timezone: courseData.timezone,
          joinedAt: FieldValue.serverTimestamp(),
        }),
    ]);
  }

  return { success: true };
}

export async function getPublicCourses(): Promise<
  | {
      success: true;
      courses: Array<{
        id: string;
        name: string;
        description: string;
        languageTag: string;
        enrolledCount: number;
      }>;
    }
  | { success: false; error: string }
> {
  const uid = await getVerifiedStudent();
  if (!uid) return { success: false, error: "unauthenticated" };

  const [coursesSnap, hubSnap] = await Promise.all([
    adminDb
      .collection("courses")
      .where("isPublic", "==", true)
      .where("isArchived", "==", false)
      .get(),
    adminDb.collection("students").doc(uid).collection("courses").get(),
  ]);

  const joinedIds = new Set(hubSnap.docs.map((d) => d.id));

  const docs = coursesSnap.docs
    .filter((d) => !joinedIds.has(d.id))
    .sort((a, b) => {
      const at = (a.data() as CourseDoc).createdAt?.toMillis() ?? 0;
      const bt = (b.data() as CourseDoc).createdAt?.toMillis() ?? 0;
      return bt - at;
    });

  const courses = await Promise.all(
    docs.map(async (doc) => {
      const data = doc.data() as CourseDoc;
      const enrollmentsSnap = await adminDb
        .collection("courses")
        .doc(doc.id)
        .collection("enrollments")
        .get();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        languageTag: data.languageTag,
        enrolledCount: enrollmentsSnap.size,
      };
    })
  );

  return { success: true, courses };
}

export async function joinPublicCourse(
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const uid = await getVerifiedStudent();
  if (!uid) return { success: false, error: "unauthenticated" };

  const snap = await adminDb.collection("courses").doc(courseId).get();
  if (!snap.exists) return { success: false, error: "not_found" };

  const data = snap.data() as CourseDoc;
  if (!data.isPublic) return { success: false, error: "not_public" };

  const enrollSnap = await adminDb
    .collection("courses")
    .doc(courseId)
    .collection("enrollments")
    .doc(uid)
    .get();

  if (!enrollSnap.exists) {
    await Promise.all([
      enrollStudent(courseId, uid),
      adminDb
        .collection("students")
        .doc(uid)
        .collection("courses")
        .doc(courseId)
        .set({
          courseId,
          courseName: data.name,
          timezone: data.timezone,
          joinedAt: FieldValue.serverTimestamp(),
        }),
    ]);
  }

  revalidatePath("/courses");
  return { success: true };
}

export async function leaveCourse(
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const uid = await getVerifiedStudent();
  if (!uid) return { success: false, error: "unauthenticated" };

  await Promise.all([
    adminDb
      .collection("courses")
      .doc(courseId)
      .collection("enrollments")
      .doc(uid)
      .delete(),
    adminDb.recursiveDelete(
      adminDb.collection("students").doc(uid).collection("courses").doc(courseId)
    ),
  ]);

  revalidatePath("/courses");
  return { success: true };
}
