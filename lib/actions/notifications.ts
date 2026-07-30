"use server";

import type { ReactElement } from "react";
import { getCourse } from "@/lib/repositories/courses";
import { listEnrolledStudentIds } from "@/lib/repositories/enrollments";
import { getUser, getUsers } from "@/lib/repositories/users";
import { getChallenge } from "@/lib/repositories/challenges";
import { getProject, getTask } from "@/lib/repositories/projects";
import { sendEmail } from "@/lib/services/email/send";
import { ChallengeCreatedEmail } from "@/emails/ChallengeCreatedEmail";
import { PracticeChallengeCreatedEmail } from "@/emails/PracticeChallengeCreatedEmail";
import { ProjectCreatedEmail } from "@/emails/ProjectCreatedEmail";
import { TaskCreatedEmail } from "@/emails/TaskCreatedEmail";
import { NudgeEmail } from "@/emails/NudgeEmail";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "https://codestreak-app.vercel.app").replace(/\/$/, "");

// Sends one email per uid, in parallel, without letting one failure block the rest.
async function notifyStudents(
  uids: string[],
  build: (studentName: string) => { subject: string; react: ReactElement }
): Promise<void> {
  if (uids.length === 0) return;

  const users = await getUsers(uids);
  const results = await Promise.allSettled(
    Array.from(users.values()).map((user) => {
      const { subject, react } = build(user.name);
      return sendEmail({ to: user.email, subject, react });
    })
  );

  for (const result of results) {
    if (result.status === "rejected") {
      console.error("[notifications] sendEmail failed:", result.reason);
    }
  }
}

// Called fire-and-forget from other server actions (auth already verified by caller).
export async function notifyChallengeCreated(
  courseId: string,
  challengeId: string
): Promise<void> {
  const course = await getCourse(courseId);
  if (!course || course.isArchived) return;

  const challenge = await getChallenge(courseId, challengeId);
  if (!challenge) return;

  const studentIds = await listEnrolledStudentIds(courseId);
  const ctaUrl = `${APP_URL}/dashboard/student/challenge?courseId=${courseId}`;

  await notifyStudents(studentIds, (studentName) => ({
    subject: `New challenge in ${course.name}: ${challenge.title}`,
    react: ChallengeCreatedEmail({
      studentName,
      courseName: course.name,
      challengeTitle: challenge.title,
      difficulty: challenge.difficulty,
      topicTag: challenge.topicTag,
      ctaUrl,
    }),
  }));
}

// Sibling to notifyChallengeCreated, but for the Practice module — separate
// copy/CTA since this isn't "today's challenge is live".
export async function notifyPracticeChallengeCreated(
  courseId: string,
  challengeId: string
): Promise<void> {
  const course = await getCourse(courseId);
  if (!course || course.isArchived) return;

  const challenge = await getChallenge(courseId, challengeId);
  if (!challenge) return;

  const studentIds = await listEnrolledStudentIds(courseId);
  const ctaUrl = `${APP_URL}/dashboard/student/practice?courseId=${courseId}`;

  await notifyStudents(studentIds, (studentName) => ({
    subject: `New challenge in ${course.name}: ${challenge.title}`,
    react: PracticeChallengeCreatedEmail({
      studentName,
      courseName: course.name,
      challengeTitle: challenge.title,
      difficulty: challenge.difficulty,
      topicTag: challenge.topicTag,
      ctaUrl,
    }),
  }));
}

export async function notifyProjectCreated(courseId: string, projectId: string): Promise<void> {
  const course = await getCourse(courseId);
  if (!course || course.isArchived) return;

  const project = await getProject(courseId, projectId);
  if (!project) return;

  const studentIds =
    project.scope === "STUDENTS"
      ? (project.studentIds ?? [])
      : await listEnrolledStudentIds(courseId);

  const ctaUrl = `${APP_URL}/dashboard/student/sprint?courseId=${courseId}`;

  await notifyStudents(studentIds, (studentName) => ({
    subject: `New project in ${course.name}: ${project.name}`,
    react: ProjectCreatedEmail({
      studentName,
      courseName: course.name,
      projectName: project.name,
      projectDescription: project.description ?? "",
      ctaUrl,
    }),
  }));
}

export async function notifyTaskCreated(
  courseId: string,
  projectId: string,
  taskId: string,
  studentId: string
): Promise<void> {
  const course = await getCourse(courseId);
  if (!course || course.isArchived) return;

  const [project, task] = await Promise.all([
    getProject(courseId, projectId),
    getTask(courseId, projectId, studentId, taskId),
  ]);
  if (!project || !task) return;

  const ctaUrl = `${APP_URL}/dashboard/student/sprint?courseId=${courseId}`;
  const dueDate = task.dueDate ? task.dueDate.toDate().toISOString().slice(0, 10) : null;

  await notifyStudents([studentId], (studentName) => ({
    subject: `New task in ${project.name}: ${task.title}`,
    react: TaskCreatedEmail({
      studentName,
      courseName: course.name,
      projectName: project.name,
      taskTitle: task.title,
      dueDate,
      ctaUrl,
    }),
  }));
}

export async function notifyStudentNudged(courseId: string, studentId: string): Promise<void> {
  const course = await getCourse(courseId);
  if (!course || course.isArchived) return;

  const instructor = await getUser(course.instructorId);
  const ctaUrl = `${APP_URL}/dashboard/student?courseId=${courseId}`;

  await notifyStudents([studentId], (studentName) => ({
    subject: `${instructor?.name ?? "Your instructor"} sent you a nudge in ${course.name}`,
    react: NudgeEmail({
      studentName,
      courseName: course.name,
      instructorName: instructor?.name ?? "Your instructor",
      ctaUrl,
    }),
  }));
}
