"use server";

import { revalidatePath } from "next/cache";
import type { CourseDoc, StreakEntryDoc } from "@/lib/firebase/types";
import { requireRole } from "@/lib/auth/session";
import { initials } from "@/lib/format";
import { getUser, getUsers } from "@/lib/repositories/users";
import * as coursesRepo from "@/lib/repositories/courses";
import * as enrollmentsRepo from "@/lib/repositories/enrollments";
import * as streakEntriesRepo from "@/lib/repositories/streakEntries";
import * as submissionsRepo from "@/lib/repositories/submissions";
import * as checkinsRepo from "@/lib/repositories/checkins";
import * as journalRepo from "@/lib/repositories/journal";
import * as challengesRepo from "@/lib/repositories/challenges";
import { listSprintCards } from "@/lib/repositories/sprintCards";
import {
  calcStreak,
  lastActiveDays,
  buildStudentHeatmap,
  buildClassHeatmap,
} from "./instructor.calc";
import {
  generateChallengeDrafts,
  type AiChallengeDraft,
} from "@/lib/services/openai/challengeGeneration";
import { notifyChallengeCreated, notifyStudentNudged } from "@/lib/actions/notifications";


const AT_RISK_DAYS = 1;
const HEATMAP_WEEKS = 18;
const DRAWER_RECENT_LIMIT = 5;
const HISTORY_PAGE_SIZE = 20;

// ── Types ────────────────────────────────────────────────────────────────────

export type AtRiskStudent = {
  id: string;
  name: string;
  initials: string;
  lastDays: number;
};

export type OverviewData = {
  courseId: string;
  stats: Array<{ label: string; value: string; sub: string }>;
  heatmap: number[][];
  weekCount: number;
  atRiskStudents: AtRiskStudent[];
};

export type StudentRow = {
  id: string;
  name: string;
  initials: string;
  streak: number;
  lastDays: number;
  challenges: number;
  checkinsThisWeek: number;
  isAtRisk: boolean;
};

export type StudentDetail = {
  id: string;
  name: string;
  initials: string;
  streak: number;
  challenges: number;
  lastDays: number;
  isAtRisk: boolean;
  heatmap: number[][];
  sprintSnapshot: { todo: number; inProgress: number; done: number };
  recentJournal: Array<{
    id: string;
    content: string;
    triggerType: string;
    createdAt: string;
  }>;
  challengeSubmissions: Array<{
    id: string;
    challengeId: string;
    challengeTitle: string;
    difficulty: string;
    code: string;
    submittedAt: string;
  }>;
  checkIns: Array<{
    id: string;
    note: string;
    createdAt: string;
  }>;
  checkInsTotal: number;
};

export type SubmissionHistoryItem = {
  id: string;
  challengeId: string;
  challengeTitle: string;
  difficulty: string;
  code: string;
  submittedAt: string;
};

export type CheckInHistoryItem = {
  id: string;
  note: string;
  createdAt: string;
};

export type CourseSettings = {
  courseId: string;
  name: string;
  description: string;
  languageTag: string;
  timezone: string;
  inviteCode: string;
  streakRules: { challenge: boolean; checkin: boolean; sprintCard: boolean };
  isArchived: boolean;
  isPublic: boolean;
};

// ── Private helpers ──────────────────────────────────────────────────────────

async function verifyInstructor(): Promise<string | null> {
  const user = await requireRole("INSTRUCTOR");
  return user?.uid ?? null;
}

async function getCourse(
  uid: string,
  courseId: string
): Promise<{ id: string; data: CourseDoc } | null> {
  const data = await coursesRepo.getCourseOwnedByInstructor(uid, courseId);
  if (!data) return null;
  return { id: courseId, data };
}

async function verifyStudentAccess(
  courseId: string,
  studentId: string
): Promise<
  | { ok: true; uid: string; course: { id: string; data: CourseDoc } }
  | { ok: false; error: string }
> {
  const uid = await verifyInstructor();
  if (!uid) return { ok: false, error: "unauthenticated" };

  const [course, isEnrolled] = await Promise.all([
    getCourse(uid, courseId),
    enrollmentsRepo.isEnrolled(courseId, studentId),
  ]);
  if (!course) return { ok: false, error: "no_course" };
  if (!isEnrolled) return { ok: false, error: "not_enrolled" };

  return { ok: true, uid, course };
}

export async function getInstructorCourses(): Promise<
  | {
      success: true;
      courses: Array<{
        id: string;
        name: string;
        description: string;
        languageTag: string;
        isArchived: boolean;
        inviteCode: string;
      }>;
    }
  | { success: false; error: string }
> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const courses = await coursesRepo.listInstructorCourses(uid);

  return {
    success: true,
    courses: courses.map(({ id, data }) => ({
      id,
      name: data.name,
      description: data.description,
      languageTag: data.languageTag,
      isArchived: data.isArchived,
      inviteCode: data.inviteCode,
    })),
  };
}

// ── Server actions ───────────────────────────────────────────────────────────

export async function getInstructorInfo(courseId: string): Promise<{
  name: string;
  courseName: string;
  courseId: string | null;
} | null> {
  const uid = await verifyInstructor();
  if (!uid) return null;

  const [user, course] = await Promise.all([
    getUser(uid),
    getCourse(uid, courseId),
  ]);

  return {
    name: user ? user.name : "Instructor",
    courseName: course ? course.data.name : "",
    courseId: course?.id ?? null,
  };
}

export async function getClassOverview(courseId: string): Promise<
  { success: true; data: OverviewData } | { success: false; error: string }
> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const studentIds = await enrollmentsRepo.listEnrolledStudentIds(course.id);
  const totalEnrolled = studentIds.length;

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: course.data.timezone,
  });

  if (totalEnrolled === 0) {
    const emptyGrid = Array.from({ length: HEATMAP_WEEKS }, () => Array(7).fill(0));
    return {
      success: true,
      data: {
        courseId: course.id,
        stats: [
          { label: "ENROLLED", value: "0", sub: "students" },
          { label: "AVG STREAK", value: "—", sub: "days" },
          { label: "ACTIVE TODAY", value: "—", sub: "of 0" },
          { label: "AT RISK", value: "—", sub: `inactive ${AT_RISK_DAYS}+ days` },
        ],
        heatmap: emptyGrid,
        weekCount: HEATMAP_WEEKS,
        atRiskStudents: [],
      },
    };
  }

  const [usersById, allStreakEntries] = await Promise.all([
    getUsers(studentIds),
    Promise.all(
      studentIds.map((sid) => streakEntriesRepo.listStreakEntriesDesc(sid, course.id, 365))
    ),
  ]);
  const allData = studentIds.map((sid, i) => ({
    sid,
    user: usersById.get(sid) ?? null,
    streakEntries: allStreakEntries[i],
  }));

  let totalStreak = 0;
  let activeToday = 0;
  const atRiskStudents: AtRiskStudent[] = [];
  const allEntries = new Map<string, Map<string, StreakEntryDoc>>();

  for (const { sid, user, streakEntries } of allData) {
    const name = user ? user.name : "Unknown";
    const entryMap = new Map<string, StreakEntryDoc>();
    for (const { id, data } of streakEntries) entryMap.set(id, data);
    allEntries.set(sid, entryMap);

    const streak = calcStreak(entryMap, today);
    totalStreak += streak;

    const todayEntry = entryMap.get(today);
    if (
      todayEntry &&
      (todayEntry.sources.challenge ||
        todayEntry.sources.checkin ||
        todayEntry.sources.sprintCard)
    )
      activeToday++;

    const days = lastActiveDays(entryMap);
    if (days >= AT_RISK_DAYS)
      atRiskStudents.push({ id: sid, name, initials: initials(name), lastDays: days });
  }

  const avgStreak = Math.round(totalStreak / totalEnrolled);
  const heatmap = buildClassHeatmap(allEntries, today, HEATMAP_WEEKS, totalEnrolled);

  return {
    success: true,
    data: {
      courseId: course.id,
      stats: [
        { label: "ENROLLED", value: String(totalEnrolled), sub: "students" },
        { label: "AVG STREAK", value: String(avgStreak), sub: "days" },
        { label: "ACTIVE TODAY", value: String(activeToday), sub: `of ${totalEnrolled}` },
        {
          label: "AT RISK",
          value: String(atRiskStudents.length),
          sub: `inactive ${AT_RISK_DAYS}+ days`,
        },
      ],
      heatmap,
      weekCount: HEATMAP_WEEKS,
      atRiskStudents: atRiskStudents.sort((a, b) => b.lastDays - a.lastDays),
    },
  };
}

export async function getRoster(courseId: string): Promise<
  | { success: true; courseId: string; rows: StudentRow[] }
  | { success: false; error: string }
> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const studentIds = await enrollmentsRepo.listEnrolledStudentIds(course.id);

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: course.data.timezone,
  });
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);

  const usersById = await getUsers(studentIds);

  const rows = await Promise.all(
    studentIds.map(async (sid) => {
      const [streakEntries, submissionCount, checkinCount] =
        await Promise.all([
          streakEntriesRepo.listStreakEntriesDesc(sid, course.id, 365),
          submissionsRepo.countSubmissionsFull(sid, course.id),
          checkinsRepo.countCheckInsSince(sid, course.id, sevenDaysAgo),
        ]);

      const user = usersById.get(sid) ?? null;
      const name = user ? user.name : "Unknown";
      const entryMap = new Map<string, StreakEntryDoc>();
      for (const { id, data } of streakEntries) entryMap.set(id, data);

      const streak = calcStreak(entryMap, today);
      const days = lastActiveDays(entryMap);

      return {
        id: sid,
        name,
        initials: initials(name),
        streak,
        lastDays: days,
        challenges: submissionCount,
        checkinsThisWeek: checkinCount,
        isAtRisk: days >= AT_RISK_DAYS,
      } satisfies StudentRow;
    })
  );

  return { success: true, courseId: course.id, rows };
}

export async function getStudentDetail(
  courseId: string,
  studentId: string
): Promise<
  { success: true; student: StudentDetail } | { success: false; error: string }
> {
  const access = await verifyStudentAccess(courseId, studentId);
  if (!access.ok) return { success: false, error: access.error };
  const { course } = access;

  const [
    user,
    streakEntries,
    sprintCards,
    recentJournalRows,
    recentSubmissions,
    submissionCount,
    recentCheckIns,
    checkInCount,
    courseChallenges,
  ] = await Promise.all([
    getUser(studentId),
    streakEntriesRepo.listStreakEntriesDesc(studentId, course.id, 84),
    listSprintCards(studentId, course.id),
    journalRepo.listRecentJournalEntries(studentId, course.id, DRAWER_RECENT_LIMIT),
    submissionsRepo.listRecentSubmissions(studentId, course.id, DRAWER_RECENT_LIMIT),
    submissionsRepo.countSubmissions(studentId, course.id),
    checkinsRepo.listRecentCheckIns(studentId, course.id, DRAWER_RECENT_LIMIT),
    checkinsRepo.countCheckIns(studentId, course.id),
    challengesRepo.listChallenges(course.id),
  ]);

  const name = user ? user.name : "Unknown";
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: course.data.timezone,
  });

  const entryMap = new Map<string, StreakEntryDoc>();
  for (const { id, data } of streakEntries) entryMap.set(id, data);

  const streak = calcStreak(entryMap, today);
  const days = lastActiveDays(entryMap);
  const heatmap = buildStudentHeatmap(entryMap, today, 12);

  const todo = sprintCards.filter((c) => c.status === "TODO").length;
  const inProgress = sprintCards.filter((c) => c.status === "IN_PROGRESS").length;
  const done = sprintCards.filter((c) => c.status === "DONE").length;

  const recentJournal = recentJournalRows.map(({ id, data: d }) => ({
    id,
    content: d.content,
    triggerType: d.triggerType,
    createdAt: (d.createdAt?.toDate() ?? new Date()).toISOString(),
  }));

  const challengeInfo = new Map(courseChallenges.map(({ id, data }) => [id, data]));

  const challengeSubmissions = recentSubmissions.map(({ id, data: d }) => {
    const challenge = challengeInfo.get(d.challengeId);
    return {
      id,
      challengeId: d.challengeId,
      challengeTitle: challenge?.title ?? "Deleted challenge",
      difficulty: challenge?.difficulty ?? "MEDIUM",
      code: d.code,
      submittedAt: (d.submittedAt?.toDate() ?? new Date()).toISOString(),
    };
  });

  const checkIns = recentCheckIns.map(({ id, data: d }) => ({
    id,
    note: d.note,
    createdAt: (d.createdAt?.toDate() ?? new Date()).toISOString(),
  }));

  return {
    success: true,
    student: {
      id: studentId,
      name,
      initials: initials(name),
      streak,
      challenges: submissionCount,
      lastDays: days,
      isAtRisk: days >= AT_RISK_DAYS,
      heatmap,
      sprintSnapshot: { todo, inProgress, done },
      recentJournal,
      challengeSubmissions,
      checkIns,
      checkInsTotal: checkInCount,
    },
  };
}

export async function getStudentSubmissionHistory(
  courseId: string,
  studentId: string,
  cursor: string | null = null
): Promise<
  | {
      success: true;
      studentName: string;
      items: SubmissionHistoryItem[];
      nextCursor: string | null;
    }
  | { success: false; error: string }
> {
  const access = await verifyStudentAccess(courseId, studentId);
  if (!access.ok) return { success: false, error: access.error };
  const { course } = access;

  const [user, courseChallenges] = await Promise.all([
    getUser(studentId),
    challengesRepo.listChallenges(course.id),
  ]);
  const studentName = user ? user.name : "Unknown";

  const challengeInfo = new Map(courseChallenges.map(({ id, data }) => [id, data]));

  const cursorDate = cursor ? new Date(cursor) : null;
  const rows = await submissionsRepo.listSubmissionsPage(
    studentId,
    course.id,
    HISTORY_PAGE_SIZE + 1,
    cursorDate
  );
  const hasMore = rows.length > HISTORY_PAGE_SIZE;
  const docs = hasMore ? rows.slice(0, HISTORY_PAGE_SIZE) : rows;

  const items = docs.map(({ id, data: d }) => {
    const challenge = challengeInfo.get(d.challengeId);
    return {
      id,
      challengeId: d.challengeId,
      challengeTitle: challenge?.title ?? "Deleted challenge",
      difficulty: challenge?.difficulty ?? "MEDIUM",
      code: d.code,
      submittedAt: (d.submittedAt?.toDate() ?? new Date()).toISOString(),
    };
  });

  return {
    success: true,
    studentName,
    items,
    nextCursor: hasMore ? items[items.length - 1].submittedAt : null,
  };
}

export async function getStudentCheckInHistory(
  courseId: string,
  studentId: string,
  cursor: string | null = null
): Promise<
  | {
      success: true;
      studentName: string;
      items: CheckInHistoryItem[];
      nextCursor: string | null;
    }
  | { success: false; error: string }
> {
  const access = await verifyStudentAccess(courseId, studentId);
  if (!access.ok) return { success: false, error: access.error };
  const { course } = access;

  const user = await getUser(studentId);
  const studentName = user ? user.name : "Unknown";

  const cursorDate = cursor ? new Date(cursor) : null;
  const rows = await checkinsRepo.listCheckInsPage(
    studentId,
    course.id,
    HISTORY_PAGE_SIZE + 1,
    cursorDate
  );
  const hasMore = rows.length > HISTORY_PAGE_SIZE;
  const docs = hasMore ? rows.slice(0, HISTORY_PAGE_SIZE) : rows;

  const items = docs.map(({ id, data: d }) => ({
    id,
    note: d.note,
    createdAt: (d.createdAt?.toDate() ?? new Date()).toISOString(),
  }));

  return {
    success: true,
    studentName,
    items,
    nextCursor: hasMore ? items[items.length - 1].createdAt : null,
  };
}

export async function nudgeStudent(
  courseId: string,
  studentId: string
): Promise<{ success: boolean; error?: string }> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  if (!(await enrollmentsRepo.isEnrolled(courseId, studentId)))
    return { success: false, error: "not_enrolled" };

  notifyStudentNudged(courseId, studentId).catch((err) =>
    console.error("[notifications] notifyStudentNudged failed:", err)
  );

  return { success: true };
}

export async function getSettings(courseId: string): Promise<
  { success: true; settings: CourseSettings } | { success: false; error: string }
> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  return {
    success: true,
    settings: {
      courseId: course.id,
      name: course.data.name,
      description: course.data.description,
      languageTag: course.data.languageTag,
      timezone: course.data.timezone,
      inviteCode: course.data.inviteCode,
      streakRules: course.data.streakRules,
      isArchived: course.data.isArchived,
      isPublic: course.data.isPublic ?? false,
    },
  };
}

export async function updateCourseSettings(
  courseId: string,
  data: {
    name?: string;
    description?: string;
    languageTag?: string;
    timezone?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const updates: Record<string, string> = {};
  if (data.name !== undefined) updates.name = data.name;
  if (data.description !== undefined) updates.description = data.description;
  if (data.languageTag !== undefined) updates.languageTag = data.languageTag;
  if (data.timezone !== undefined) updates.timezone = data.timezone;

  if (Object.keys(updates).length > 0)
    await coursesRepo.updateCourse(course.id, updates);

  return { success: true };
}

export async function updateStreakRules(
  courseId: string,
  rules: {
    challenge: boolean;
    checkin: boolean;
    sprintCard: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  await coursesRepo.updateCourse(course.id, { streakRules: rules });

  return { success: true };
}

export async function setCourseVisibility(
  courseId: string,
  isPublic: boolean
): Promise<{ success: boolean; isPublic?: boolean; error?: string }> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  await coursesRepo.updateCourse(course.id, { isPublic });

  revalidatePath("/courses");
  return { success: true, isPublic };
}

export async function toggleCourseArchive(courseId: string): Promise<{
  success: boolean;
  isArchived?: boolean;
  error?: string;
}> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const next = !course.data.isArchived;
  await coursesRepo.updateCourse(course.id, { isArchived: next });

  revalidatePath("/courses");
  return { success: true, isArchived: next };
}

export async function deleteCourse(
  courseId: string
): Promise<{ success: boolean; error?: string }> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  await coursesRepo.deleteCourseCascade(courseId);

  revalidatePath("/courses");
  return { success: true };
}

export async function createInstructorChallenge(
  courseId: string,
  data: {
    title: string;
    description: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    topicTag: string;
    starterCode: string;
    scheduledFor: string;
    isDraft: boolean;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  if (!data.title.trim()) return { success: false, error: "missing_title" };

  const scheduledDate = new Date(data.scheduledFor + "T12:00:00Z");

  const id = await challengesRepo.createChallenge(course.id, {
    title: data.title,
    description: data.description,
    difficulty: data.difficulty,
    topicTag: data.topicTag,
    starterCode: data.starterCode,
    scheduledFor: scheduledDate,
    isDraft: data.isDraft,
    isAiGenerated: false,
  });

  if (!data.isDraft) {
    notifyChallengeCreated(course.id, id).catch((err) =>
      console.error("[notifications] notifyChallengeCreated failed:", err)
    );
  }

  return { success: true, id };
}

export async function generateAiChallenges(
  courseId: string,
  topic: string
): Promise<
  | { success: true; challenges: AiChallengeDraft[] }
  | { success: false; error: string }
> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  if (!topic.trim()) return { success: false, error: "empty_topic" };

  const course = await getCourse(uid, courseId);
  const lang = course?.data.languageTag ?? "Python";

  try {
    const challenges = await generateChallengeDrafts(lang, topic);
    return { success: true, challenges };
  } catch {
    return { success: false, error: "generation_failed" };
  }
}
