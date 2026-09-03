import { Op } from "sequelize";
import { sequelize } from "@/lib/db/sequelize";
import {
  Enrollment,
  Course,
  StreakEntry,
  CheckIn,
  JournalEntry,
  ChallengeSubmission,
  ChallengeAttempt,
  SprintCard,
} from "@/lib/db/models";

export async function isEnrolled(courseId: string, studentId: string): Promise<boolean> {
  const row = await Enrollment.findOne({ where: { courseId, studentId } });
  return row !== null;
}

export async function enrollStudent(courseId: string, studentId: string): Promise<void> {
  await Enrollment.create({ courseId, studentId });
}

// No FK path from Enrollment to the activity tables (they key off
// student_id/course_id directly), so this cascade has to be explicit.
export async function unenrollStudent(courseId: string, studentId: string): Promise<void> {
  await sequelize.transaction(async (t) => {
    const where = { studentId, courseId };
    await Promise.all([
      StreakEntry.destroy({ where, transaction: t }),
      CheckIn.destroy({ where, transaction: t }),
      JournalEntry.destroy({ where, transaction: t }),
      ChallengeSubmission.destroy({ where, transaction: t }),
      ChallengeAttempt.destroy({ where, transaction: t }),
      SprintCard.destroy({ where, transaction: t }),
      Enrollment.destroy({ where: { courseId, studentId }, transaction: t }),
    ]);
  });
}

export async function listEnrolledStudentIds(courseId: string): Promise<string[]> {
  const rows = await Enrollment.findAll({ where: { courseId }, attributes: ["studentId"] });
  return rows.map((row) => row.studentId);
}

export async function countEnrollments(courseId: string): Promise<number> {
  return Enrollment.count({ where: { courseId } });
}

export interface EnrolledCourseInfo {
  courseId: string;
  courseName: string;
  timezone: string;
}

// courseName/timezone reflect the current Course row, not a snapshot.
export async function listEnrolledCourses(
  studentId: string
): Promise<Array<{ id: string; data: EnrolledCourseInfo }>> {
  const enrollments = await Enrollment.findAll({
    where: { studentId },
    order: [["joinedAt", "ASC"]],
  });
  if (enrollments.length === 0) return [];

  const courseIds = enrollments.map((e) => e.courseId);
  const courses = await Course.findAll({ where: { id: { [Op.in]: courseIds } } });
  const courseById = new Map(courses.map((c) => [c.id, c]));

  const rows: Array<{ id: string; data: EnrolledCourseInfo }> = [];
  for (const e of enrollments) {
    const course = courseById.get(e.courseId);
    if (!course) continue;
    rows.push({
      id: e.courseId,
      data: { courseId: e.courseId, courseName: course.name, timezone: course.timezone },
    });
  }
  return rows;
}

export async function getFirstEnrolledCourse(
  studentId: string
): Promise<{ id: string; data: EnrolledCourseInfo } | null> {
  const rows = await listEnrolledCourses(studentId);
  return rows[0] ?? null;
}
