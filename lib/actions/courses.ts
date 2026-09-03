"use server";

import { revalidatePath } from "next/cache";
import { UniqueConstraintError } from "sequelize";
import { getCurrentUser, requireRole } from "@/lib/auth/session";
import { generateInviteCode } from "@/lib/domain/inviteCode";
import * as coursesRepo from "@/lib/repositories/courses";
import * as enrollmentsRepo from "@/lib/repositories/enrollments";

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

  // invite_code is UNIQUE — retry with a fresh code on collision.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const courseId = await coursesRepo.createCourse({
        name: data.name.trim(),
        description: data.description.trim(),
        languageTag: data.languageTag,
        timezone: data.timezone,
        inviteCode: generateInviteCode(),
        instructorId: uid,
        streakRules: data.streakRules,
      });
      return { success: true, courseId };
    } catch (err) {
      if (!(err instanceof UniqueConstraintError)) throw err;
    }
  }

  return { success: false, error: "invite_code_collision" };
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
  const { id: courseId } = found;

  const alreadyEnrolled = await enrollmentsRepo.isEnrolled(courseId, uid);

  if (!alreadyEnrolled) {
    await enrollStudent(courseId, uid);
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
    await enrollStudent(courseId, uid);
  }

  revalidatePath("/courses");
  return { success: true };
}

export async function leaveCourse(
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const uid = await getVerifiedStudent();
  if (!uid) return { success: false, error: "unauthenticated" };

  await enrollmentsRepo.unenrollStudent(courseId, uid);

  revalidatePath("/courses");
  return { success: true };
}
