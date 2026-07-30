"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser, requireRole } from "@/lib/auth/session";
import { generateInviteCode } from "@/lib/domain/inviteCode";
import * as coursesRepo from "@/lib/repositories/courses";
import * as enrollmentsRepo from "@/lib/repositories/enrollments";
import * as studentHubRepo from "@/lib/repositories/studentHub";

async function getVerifiedInstructor(): Promise<string | null> {
  const user = await requireRole("INSTRUCTOR");
  return user?.uid ?? null;
}

export async function createCourse(data: {
  name: string;
  description: string;
  languageTag: string;
  timezone: string;
  streakRules: { challenge: boolean; checkin: boolean; sprintCard: boolean; practice: boolean };
}): Promise<{ success: boolean; courseId?: string; error?: string }> {
  const uid = await getVerifiedInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  if (!data.name.trim()) return { success: false, error: "missing_name" };

  let inviteCode = generateInviteCode();
  // Ensure uniqueness (collision is extremely rare but guard anyway)
  for (let i = 0; i < 5; i++) {
    if (!(await coursesRepo.isInviteCodeTaken(inviteCode))) break;
    inviteCode = generateInviteCode();
  }

  const courseId = await coursesRepo.createCourse({
    name: data.name.trim(),
    description: data.description.trim(),
    languageTag: data.languageTag,
    timezone: data.timezone,
    inviteCode,
    instructorId: uid,
    streakRules: data.streakRules,
  });

  return { success: true, courseId };
}

export async function getCourseByInviteCode(inviteCode: string) {
  const found = await coursesRepo.getCourseByInviteCode(inviteCode.toUpperCase());
  if (!found) return { success: false as const, error: "not_found" };
  return {
    success: true as const,
    courseId: found.id,
    name: found.data.name,
    description: found.data.description,
    languageTag: found.data.languageTag,
  };
}

export async function enrollStudent(courseId: string, studentId: string) {
  await enrollmentsRepo.enrollStudent(courseId, studentId);
  return { success: true as const };
}

async function getVerifiedStudent(): Promise<string | null> {
  const user = await requireRole("STUDENT");
  return user?.uid ?? null;
}

export async function getJoinPageData(inviteCode: string): Promise<
  | { success: false; error: "not_found" }
  | {
      success: true;
      course: { courseId: string; name: string; description: string; languageTag: string };
      authState: "unauthenticated" | "instructor" | "enrolled" | "not_enrolled";
    }
> {
  const found = await coursesRepo.getCourseByInviteCode(inviteCode.toUpperCase());
  if (!found) return { success: false, error: "not_found" };

  const course = {
    courseId: found.id,
    name: found.data.name,
    description: found.data.description,
    languageTag: found.data.languageTag,
  };

  const user = await getCurrentUser();
  if (!user) return { success: true, course, authState: "unauthenticated" };

  if (user.role !== "STUDENT") return { success: true, course, authState: "instructor" };

  const enrolled = await enrollmentsRepo.isEnrolled(found.id, user.uid);

  return {
    success: true,
    course,
    authState: enrolled ? "enrolled" : "not_enrolled",
  };
}

export async function joinCourse(
  inviteCode: string
): Promise<{ success: boolean; error?: string }> {
  const uid = await getVerifiedStudent();
  if (!uid) return { success: false, error: "unauthenticated" };

  const found = await coursesRepo.getCourseByInviteCode(inviteCode.toUpperCase());
  if (!found) return { success: false, error: "not_found" };
  const { id: courseId, data: courseData } = found;

  const alreadyEnrolled = await enrollmentsRepo.isEnrolled(courseId, uid);

  if (!alreadyEnrolled) {
    await Promise.all([
      enrollStudent(courseId, uid),
      // Write student hub doc so the dashboard can list enrolled courses
      studentHubRepo.createHubDoc(uid, courseId, {
        courseName: courseData.name,
        timezone: courseData.timezone,
      }),
    ]);
  }

  return { success: true };
}

export async function joinPublicCourse(
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const uid = await getVerifiedStudent();
  if (!uid) return { success: false, error: "unauthenticated" };

  const data = await coursesRepo.getCourse(courseId);
  if (!data) return { success: false, error: "not_found" };

  if (!data.isPublic) return { success: false, error: "not_public" };

  const alreadyEnrolled = await enrollmentsRepo.isEnrolled(courseId, uid);

  if (!alreadyEnrolled) {
    await Promise.all([
      enrollStudent(courseId, uid),
      studentHubRepo.createHubDoc(uid, courseId, {
        courseName: data.name,
        timezone: data.timezone,
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
    enrollmentsRepo.unenrollStudent(courseId, uid),
    studentHubRepo.deleteHubDocCascade(uid, courseId),
  ]);

  revalidatePath("/courses");
  return { success: true };
}
