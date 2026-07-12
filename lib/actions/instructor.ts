"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type {
  UserDoc,
  CourseDoc,
  MilestoneDoc,
  StreakEntryDoc,
  SprintCardDoc,
  JournalEntryDoc,
  ChallengeDoc,
  ChallengeSubmissionDoc,
  CheckInDoc,
} from "@/lib/firebase/types";
import OpenAI from "openai";

const COOKIE = "codestreak_session";
const AT_RISK_DAYS = 3;
const HEATMAP_WEEKS = 26;
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

export type MilestoneData = {
  id: string;
  title: string;
  description: string;
  due: string;
  moduleTag: string;
  isArchived: boolean;
  todoCount: number;
  inProgressCount: number;
  doneCount: number;
  totalStudents: number;
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

export type AiChallengeDraft = {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  starter: string;
};

// ── Private helpers ──────────────────────────────────────────────────────────

async function getSession(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE);
  if (!session?.value) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(session.value, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

async function verifyInstructor(): Promise<string | null> {
  const uid = await getSession();
  if (!uid) return null;
  const userSnap = await adminDb.collection("users").doc(uid).get();
  if (!userSnap.exists) return null;
  if ((userSnap.data() as UserDoc).role !== "INSTRUCTOR") return null;
  return uid;
}

async function getCourse(
  uid: string,
  courseId: string
): Promise<{ id: string; data: CourseDoc } | null> {
  const snap = await adminDb.collection("courses").doc(courseId).get();
  if (!snap.exists) return null;
  const data = snap.data() as CourseDoc;
  if (data.instructorId !== uid) return null;
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

  const course = await getCourse(uid, courseId);
  if (!course) return { ok: false, error: "no_course" };

  const enrollmentSnap = await adminDb
    .collection("courses")
    .doc(course.id)
    .collection("enrollments")
    .doc(studentId)
    .get();
  if (!enrollmentSnap.exists) return { ok: false, error: "not_enrolled" };

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

  const snap = await adminDb
    .collection("courses")
    .where("instructorId", "==", uid)
    .orderBy("createdAt", "desc")
    .get();

  return {
    success: true,
    courses: snap.docs.map((d) => {
      const data = d.data() as CourseDoc;
      return {
        id: d.id,
        name: data.name,
        description: data.description,
        languageTag: data.languageTag,
        isArchived: data.isArchived,
        inviteCode: data.inviteCode,
      };
    }),
  };
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((p) => p[0] ?? "")
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function calcStreak(
  entryMap: Map<string, StreakEntryDoc>,
  todayStr: string
): number {
  const activeDates = new Set<string>();
  for (const [date, e] of entryMap) {
    if (e.sources.challenge || e.sources.checkin || e.sources.sprintCard)
      activeDates.add(date);
  }
  const cur = new Date(todayStr + "T12:00:00Z");
  if (!activeDates.has(todayStr)) cur.setUTCDate(cur.getUTCDate() - 1);
  let streak = 0;
  while (true) {
    const ds = cur.toISOString().slice(0, 10);
    if (!activeDates.has(ds)) break;
    streak++;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }
  return streak;
}

function lastActiveDays(entryMap: Map<string, StreakEntryDoc>): number {
  const dates = [...entryMap.entries()]
    .filter(([, e]) => e.sources.challenge || e.sources.checkin || e.sources.sprintCard)
    .map(([date]) => date)
    .sort()
    .reverse();
  if (!dates[0]) return 999;
  const ms = Date.now() - new Date(dates[0] + "T12:00:00Z").getTime();
  return Math.floor(ms / 86_400_000);
}

function heatmapLevel(entryMap: Map<string, StreakEntryDoc>, date: string): number {
  const e = entryMap.get(date);
  if (!e) return 0;
  const n =
    (e.sources.challenge ? 1 : 0) +
    (e.sources.checkin ? 1 : 0) +
    (e.sources.sprintCard ? 1 : 0);
  return n === 0 ? 0 : n === 1 ? 2 : n === 2 ? 3 : 4;
}

function buildStudentHeatmap(
  entryMap: Map<string, StreakEntryDoc>,
  todayStr: string,
  weeks: number
): number[][] {
  const total = weeks * 7;
  const start = new Date(todayStr + "T12:00:00Z");
  start.setUTCDate(start.getUTCDate() - (total - 1));

  const flat: number[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    flat.push(heatmapLevel(entryMap, d.toISOString().slice(0, 10)));
  }

  const grid: number[][] = [];
  for (let w = 0; w < weeks; w++) grid.push(flat.slice(w * 7, w * 7 + 7));
  return grid;
}

function buildClassHeatmap(
  allEntries: Map<string, Map<string, StreakEntryDoc>>,
  todayStr: string,
  weeks: number,
  totalStudents: number
): number[][] {
  const total = weeks * 7;
  const start = new Date(todayStr + "T12:00:00Z");
  start.setUTCDate(start.getUTCDate() - (total - 1));

  const flat: number[] = [];
  for (let i = 0; i < total; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    const ds = d.toISOString().slice(0, 10);
    let activeCount = 0;
    for (const studentEntries of allEntries.values()) {
      const e = studentEntries.get(ds);
      if (e && (e.sources.challenge || e.sources.checkin || e.sources.sprintCard))
        activeCount++;
    }
    if (totalStudents === 0 || activeCount === 0) { flat.push(0); continue; }
    const pct = activeCount / totalStudents;
    flat.push(pct < 0.25 ? 1 : pct < 0.5 ? 2 : pct < 0.75 ? 3 : 4);
  }

  const grid: number[][] = [];
  for (let w = 0; w < weeks; w++) grid.push(flat.slice(w * 7, w * 7 + 7));
  return grid;
}

// ── Server actions ───────────────────────────────────────────────────────────

export async function getInstructorInfo(courseId: string): Promise<{
  name: string;
  courseName: string;
  courseId: string | null;
} | null> {
  const uid = await verifyInstructor();
  if (!uid) return null;

  const [userSnap, course] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    getCourse(uid, courseId),
  ]);

  return {
    name: userSnap.exists ? (userSnap.data() as UserDoc).name : "Instructor",
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

  const enrollmentsSnap = await adminDb
    .collection("courses")
    .doc(course.id)
    .collection("enrollments")
    .get();
  const studentIds = enrollmentsSnap.docs.map((d) => d.id);
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

  const allData = await Promise.all(
    studentIds.map(async (sid) => {
      const [userSnap, streakSnap] = await Promise.all([
        adminDb.collection("users").doc(sid).get(),
        adminDb
          .collection("students")
          .doc(sid)
          .collection("courses")
          .doc(course.id)
          .collection("streakEntries")
          .orderBy("date", "desc")
          .limit(365)
          .get(),
      ]);
      return { sid, userSnap, streakSnap };
    })
  );

  let totalStreak = 0;
  let activeToday = 0;
  const atRiskStudents: AtRiskStudent[] = [];
  const allEntries = new Map<string, Map<string, StreakEntryDoc>>();

  for (const { sid, userSnap, streakSnap } of allData) {
    const name = userSnap.exists ? (userSnap.data() as UserDoc).name : "Unknown";
    const entryMap = new Map<string, StreakEntryDoc>();
    for (const doc of streakSnap.docs)
      entryMap.set(doc.id, doc.data() as StreakEntryDoc);
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

  const enrollmentsSnap = await adminDb
    .collection("courses")
    .doc(course.id)
    .collection("enrollments")
    .get();
  const studentIds = enrollmentsSnap.docs.map((d) => d.id);

  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: course.data.timezone,
  });
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 6);
  sevenDaysAgo.setUTCHours(0, 0, 0, 0);

  const rows = await Promise.all(
    studentIds.map(async (sid) => {
      const [userSnap, streakSnap, challengeSnap, checkinSnap] =
        await Promise.all([
          adminDb.collection("users").doc(sid).get(),
          adminDb
            .collection("students")
            .doc(sid)
            .collection("courses")
            .doc(course.id)
            .collection("streakEntries")
            .orderBy("date", "desc")
            .limit(365)
            .get(),
          adminDb
            .collection("students")
            .doc(sid)
            .collection("courses")
            .doc(course.id)
            .collection("challengeSubmissions")
            .get(),
          adminDb
            .collection("students")
            .doc(sid)
            .collection("courses")
            .doc(course.id)
            .collection("checkIns")
            .where("createdAt", ">=", Timestamp.fromDate(sevenDaysAgo))
            .get(),
        ]);

      const name = userSnap.exists
        ? (userSnap.data() as UserDoc).name
        : "Unknown";
      const entryMap = new Map<string, StreakEntryDoc>();
      for (const doc of streakSnap.docs)
        entryMap.set(doc.id, doc.data() as StreakEntryDoc);

      const streak = calcStreak(entryMap, today);
      const days = lastActiveDays(entryMap);

      return {
        id: sid,
        name,
        initials: initials(name),
        streak,
        lastDays: days,
        challenges: challengeSnap.size,
        checkinsThisWeek: checkinSnap.size,
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

  const submissionsRef = adminDb
    .collection("students")
    .doc(studentId)
    .collection("courses")
    .doc(course.id)
    .collection("challengeSubmissions");
  const checkInsRef = adminDb
    .collection("students")
    .doc(studentId)
    .collection("courses")
    .doc(course.id)
    .collection("checkIns");

  const [
    userSnap,
    streakSnap,
    sprintSnap,
    journalSnap,
    challengeSnap,
    challengeCountSnap,
    checkInSnap,
    checkInCountSnap,
    courseChallengesSnap,
  ] = await Promise.all([
      adminDb.collection("users").doc(studentId).get(),
      adminDb
        .collection("students")
        .doc(studentId)
        .collection("courses")
        .doc(course.id)
        .collection("streakEntries")
        .orderBy("date", "desc")
        .limit(84)
        .get(),
      adminDb
        .collection("students")
        .doc(studentId)
        .collection("courses")
        .doc(course.id)
        .collection("sprintCards")
        .get(),
      adminDb
        .collection("students")
        .doc(studentId)
        .collection("courses")
        .doc(course.id)
        .collection("journalEntries")
        .orderBy("createdAt", "desc")
        .limit(3)
        .get(),
      submissionsRef.orderBy("submittedAt", "desc").limit(DRAWER_RECENT_LIMIT).get(),
      submissionsRef.count().get(),
      checkInsRef.orderBy("createdAt", "desc").limit(DRAWER_RECENT_LIMIT).get(),
      checkInsRef.count().get(),
      adminDb.collection("courses").doc(course.id).collection("challenges").get(),
    ]);

  const name = userSnap.exists
    ? (userSnap.data() as UserDoc).name
    : "Unknown";
  const today = new Date().toLocaleDateString("en-CA", {
    timeZone: course.data.timezone,
  });

  const entryMap = new Map<string, StreakEntryDoc>();
  for (const doc of streakSnap.docs)
    entryMap.set(doc.id, doc.data() as StreakEntryDoc);

  const streak = calcStreak(entryMap, today);
  const days = lastActiveDays(entryMap);
  const heatmap = buildStudentHeatmap(entryMap, today, 12);

  const sprintCards = sprintSnap.docs.map((d) => d.data() as SprintCardDoc);
  const todo = sprintCards.filter((c) => c.status === "TODO").length;
  const inProgress = sprintCards.filter((c) => c.status === "IN_PROGRESS").length;
  const done = sprintCards.filter((c) => c.status === "DONE").length;

  const recentJournal = journalSnap.docs.map((doc) => {
    const d = doc.data() as JournalEntryDoc;
    return {
      id: doc.id,
      content: d.content,
      triggerType: d.triggerType,
      createdAt: (d.createdAt?.toDate() ?? new Date()).toISOString(),
    };
  });

  const challengeInfo = new Map<string, ChallengeDoc>();
  for (const doc of courseChallengesSnap.docs)
    challengeInfo.set(doc.id, doc.data() as ChallengeDoc);

  const challengeSubmissions = challengeSnap.docs.map((doc) => {
    const d = doc.data() as ChallengeSubmissionDoc;
    const challenge = challengeInfo.get(d.challengeId);
    return {
      id: doc.id,
      challengeId: d.challengeId,
      challengeTitle: challenge?.title ?? "Deleted challenge",
      difficulty: challenge?.difficulty ?? "MEDIUM",
      code: d.code,
      submittedAt: (d.submittedAt?.toDate() ?? new Date()).toISOString(),
    };
  });

  const checkIns = checkInSnap.docs.map((doc) => {
    const d = doc.data() as CheckInDoc;
    return {
      id: doc.id,
      note: d.note,
      createdAt: (d.createdAt?.toDate() ?? new Date()).toISOString(),
    };
  });

  return {
    success: true,
    student: {
      id: studentId,
      name,
      initials: initials(name),
      streak,
      challenges: challengeCountSnap.data().count,
      lastDays: days,
      isAtRisk: days >= AT_RISK_DAYS,
      heatmap,
      sprintSnapshot: { todo, inProgress, done },
      recentJournal,
      challengeSubmissions,
      checkIns,
      checkInsTotal: checkInCountSnap.data().count,
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

  const [userSnap, courseChallengesSnap] = await Promise.all([
    adminDb.collection("users").doc(studentId).get(),
    adminDb.collection("courses").doc(course.id).collection("challenges").get(),
  ]);
  const studentName = userSnap.exists ? (userSnap.data() as UserDoc).name : "Unknown";

  const challengeInfo = new Map<string, ChallengeDoc>();
  for (const doc of courseChallengesSnap.docs)
    challengeInfo.set(doc.id, doc.data() as ChallengeDoc);

  let query = adminDb
    .collection("students")
    .doc(studentId)
    .collection("courses")
    .doc(course.id)
    .collection("challengeSubmissions")
    .orderBy("submittedAt", "desc")
    .limit(HISTORY_PAGE_SIZE + 1);
  if (cursor) query = query.startAfter(Timestamp.fromDate(new Date(cursor)));

  const snap = await query.get();
  const hasMore = snap.docs.length > HISTORY_PAGE_SIZE;
  const docs = hasMore ? snap.docs.slice(0, HISTORY_PAGE_SIZE) : snap.docs;

  const items = docs.map((doc) => {
    const d = doc.data() as ChallengeSubmissionDoc;
    const challenge = challengeInfo.get(d.challengeId);
    return {
      id: doc.id,
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

  const userSnap = await adminDb.collection("users").doc(studentId).get();
  const studentName = userSnap.exists ? (userSnap.data() as UserDoc).name : "Unknown";

  let query = adminDb
    .collection("students")
    .doc(studentId)
    .collection("courses")
    .doc(course.id)
    .collection("checkIns")
    .orderBy("createdAt", "desc")
    .limit(HISTORY_PAGE_SIZE + 1);
  if (cursor) query = query.startAfter(Timestamp.fromDate(new Date(cursor)));

  const snap = await query.get();
  const hasMore = snap.docs.length > HISTORY_PAGE_SIZE;
  const docs = hasMore ? snap.docs.slice(0, HISTORY_PAGE_SIZE) : snap.docs;

  const items = docs.map((doc) => {
    const d = doc.data() as CheckInDoc;
    return {
      id: doc.id,
      note: d.note,
      createdAt: (d.createdAt?.toDate() ?? new Date()).toISOString(),
    };
  });

  return {
    success: true,
    studentName,
    items,
    nextCursor: hasMore ? items[items.length - 1].createdAt : null,
  };
}

export async function nudgeStudent(
  _courseId: string,
  _studentId: string
): Promise<{ success: boolean; error?: string }> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };
  return { success: true };
}

export async function getMilestones(courseId: string): Promise<
  | {
      success: true;
      courseId: string;
      milestones: MilestoneData[];
      totalStudents: number;
    }
  | { success: false; error: string }
> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const [milestonesSnap, enrollmentsSnap] = await Promise.all([
    adminDb
      .collection("courses")
      .doc(course.id)
      .collection("milestones")
      .orderBy("createdAt", "desc")
      .get(),
    adminDb
      .collection("courses")
      .doc(course.id)
      .collection("enrollments")
      .get(),
  ]);

  const studentIds = enrollmentsSnap.docs.map((d) => d.id);
  const totalStudents = studentIds.length;

  const milestones = await Promise.all(
    milestonesSnap.docs.map(async (doc) => {
      const data = doc.data() as MilestoneDoc;

      const cardCounts = await Promise.all(
        studentIds.map((sid) =>
          adminDb
            .collection("students")
            .doc(sid)
            .collection("courses")
            .doc(course.id)
            .collection("sprintCards")
            .where("milestoneId", "==", doc.id)
            .get()
            .then((s) => s.docs.map((d) => (d.data() as SprintCardDoc).status))
        )
      );

      let todoCount = 0,
        inProgressCount = 0,
        doneCount = 0;
      for (const statuses of cardCounts) {
        for (const status of statuses) {
          if (status === "TODO") todoCount++;
          else if (status === "IN_PROGRESS") inProgressCount++;
          else if (status === "DONE") doneCount++;
        }
      }

      const dueDate = data.dueDate?.toDate();
      const due = dueDate
        ? new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
          }).format(dueDate)
        : "TBD";

      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        due,
        moduleTag: data.moduleTag,
        isArchived: data.isArchived,
        todoCount,
        inProgressCount,
        doneCount,
        totalStudents,
      } satisfies MilestoneData;
    })
  );

  return { success: true, courseId: course.id, milestones, totalStudents };
}

export async function createMilestone(
  courseId: string,
  data: {
    title: string;
    description: string;
    dueDate: string;
    moduleTag: string;
  }
): Promise<{ success: boolean; id?: string; error?: string }> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const ref = await adminDb
    .collection("courses")
    .doc(course.id)
    .collection("milestones")
    .add({
      title: data.title,
      description: data.description,
      dueDate: data.dueDate
        ? Timestamp.fromDate(new Date(data.dueDate + "T12:00:00Z"))
        : null,
      moduleTag: data.moduleTag,
      isArchived: false,
      createdAt: FieldValue.serverTimestamp(),
    });

  return { success: true, id: ref.id };
}

export async function toggleMilestoneArchive(
  courseId: string,
  milestoneId: string
): Promise<{ success: boolean; isArchived?: boolean; error?: string }> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const ref = adminDb
    .collection("courses")
    .doc(course.id)
    .collection("milestones")
    .doc(milestoneId);
  const snap = await ref.get();
  if (!snap.exists) return { success: false, error: "not_found" };

  const current = (snap.data() as MilestoneDoc).isArchived;
  await ref.update({ isArchived: !current });
  return { success: true, isArchived: !current };
}

export async function pushMilestoneToStudents(
  courseId: string,
  milestoneId: string
): Promise<{ success: boolean; count?: number; error?: string }> {
  const uid = await verifyInstructor();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(uid, courseId);
  if (!course) return { success: false, error: "no_course" };

  const milestoneSnap = await adminDb
    .collection("courses")
    .doc(course.id)
    .collection("milestones")
    .doc(milestoneId)
    .get();
  if (!milestoneSnap.exists) return { success: false, error: "not_found" };
  const milestone = milestoneSnap.data() as MilestoneDoc;

  const enrollmentsSnap = await adminDb
    .collection("courses")
    .doc(course.id)
    .collection("enrollments")
    .get();

  const now = FieldValue.serverTimestamp();
  let count = 0;
  await Promise.all(
    enrollmentsSnap.docs.map(async (enrollDoc) => {
      const sid = enrollDoc.id;
      const existing = await adminDb
        .collection("students")
        .doc(sid)
        .collection("courses")
        .doc(course.id)
        .collection("sprintCards")
        .where("milestoneId", "==", milestoneId)
        .limit(1)
        .get();
      if (!existing.empty) return;
      await adminDb
        .collection("students")
        .doc(sid)
        .collection("courses")
        .doc(course.id)
        .collection("sprintCards")
        .add({
          title: milestone.title,
          description: milestone.description,
          status: "TODO",
          isInstructorSeeded: true,
          milestoneId,
          createdAt: now,
          updatedAt: now,
          movedAt: now,
        });
      count++;
    })
  );

  return { success: true, count };
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
    await adminDb.collection("courses").doc(course.id).update(updates);

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

  await adminDb
    .collection("courses")
    .doc(course.id)
    .update({ streakRules: rules });

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

  await adminDb.collection("courses").doc(course.id).update({ isPublic });

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
  await adminDb.collection("courses").doc(course.id).update({ isArchived: next });

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

  const ref = await adminDb
    .collection("courses")
    .doc(course.id)
    .collection("challenges")
    .add({
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      topicTag: data.topicTag,
      starterCode: data.starterCode,
      scheduledFor: Timestamp.fromDate(scheduledDate),
      isDraft: data.isDraft,
      isAiGenerated: false,
      createdAt: FieldValue.serverTimestamp(),
    });

  return { success: true, id: ref.id };
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

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const prompt = `Generate 5 coding challenge ideas for a ${lang} course based on this topic or syllabus excerpt:
${topic}

Return a JSON object with a "challenges" array. Each challenge has:
- title: short memorable name (3-5 words)
- description: 1-2 sentence problem description including constraints and expected output
- difficulty: one of "EASY", "MEDIUM", or "HARD"
- starter: 4-6 lines of ${lang} starter code with a function signature and a pass statement

Return ONLY valid JSON. No markdown, no code fences.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.75,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { challenges?: unknown[] };
    const challenges = (
      Array.isArray(parsed) ? parsed : (parsed.challenges ?? [])
    ).slice(0, 5) as AiChallengeDraft[];

    return {
      success: true,
      challenges: challenges.map((c, i) => ({
        id: `ai-${Date.now()}-${i}`,
        title: String((c as Record<string, unknown>).title ?? "Challenge"),
        description: String((c as Record<string, unknown>).description ?? ""),
        difficulty: String((c as Record<string, unknown>).difficulty ?? "MEDIUM"),
        starter: String((c as Record<string, unknown>).starter ?? ""),
      })),
    };
  } catch {
    return { success: false, error: "generation_failed" };
  }
}
