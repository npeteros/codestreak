import { sequelize } from "@/lib/db/sequelize";
import { Course } from "@/lib/db/models";
import type { CourseDoc } from "@/lib/types";

function toDoc(row: Course): CourseDoc {
  return {
    name: row.name,
    description: row.description,
    languageTag: row.languageTag,
    timezone: row.timezone,
    inviteCode: row.inviteCode,
    instructorId: row.instructorId,
    streakRules: {
      challenge: row.streakRuleChallenge,
      checkin: row.streakRuleCheckin,
      sprintCard: row.streakRuleSprintCard,
      practice: row.streakRulePractice,
    },
    isArchived: row.isArchived,
    isPublic: row.isPublic,
    createdAt: row.createdAt,
  };
}

export async function getCourse(courseId: string): Promise<CourseDoc | null> {
  const row = await Course.findByPk(courseId);
  return row ? toDoc(row) : null;
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
  const rows = await Course.findAll({
    where: { instructorId: uid },
    order: [["createdAt", "DESC"]],
  });
  return rows.map((row) => ({ id: row.id, data: toDoc(row) }));
}

export async function getCourseByInviteCode(
  inviteCode: string
): Promise<{ id: string; data: CourseDoc } | null> {
  const row = await Course.findOne({ where: { inviteCode } });
  return row ? { id: row.id, data: toDoc(row) } : null;
}

export async function listPublicActiveCourses(): Promise<
  Array<{ id: string; data: CourseDoc }>
> {
  const rows = await Course.findAll({ where: { isPublic: true, isArchived: false } });
  return rows.map((row) => ({ id: row.id, data: toDoc(row) }));
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
  const row = await Course.create({
    name: data.name,
    description: data.description,
    languageTag: data.languageTag,
    timezone: data.timezone,
    inviteCode: data.inviteCode,
    instructorId: data.instructorId,
    streakRuleChallenge: data.streakRules.challenge,
    streakRuleCheckin: data.streakRules.checkin,
    streakRuleSprintCard: data.streakRules.sprintCard,
    streakRulePractice: data.streakRules.practice,
  });
  return row.id;
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
  const { streakRules, ...rest } = updates;
  await Course.update(
    {
      ...rest,
      ...(streakRules
        ? {
            streakRuleChallenge: streakRules.challenge,
            streakRuleCheckin: streakRules.checkin,
            streakRuleSprintCard: streakRules.sprintCard,
            streakRulePractice: streakRules.practice,
          }
        : {}),
    },
    { where: { id: courseId } }
  );
}

// FK ON DELETE CASCADE handles the actual row removal once Course goes;
// the transaction just makes it all-or-nothing.
export async function deleteCourseCascade(courseId: string): Promise<void> {
  await sequelize.transaction(async (t) => {
    await Course.destroy({ where: { id: courseId }, transaction: t });
  });
}
