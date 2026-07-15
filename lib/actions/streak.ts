"use server";

import type { StreakEntryDoc } from "@/lib/firebase/types";
import type { StreakEntry as CalcEntry } from "@/lib/streak/calculate";
import { computeStreakData } from "./streak.calc";
import { getUid } from "@/lib/auth/session";
import { getCourse } from "@/lib/repositories/courses";
import { getFirstEnrolledCourse } from "@/lib/repositories/studentHub";
import { listStreakEntriesAsc, listStreakEntriesDesc, upsertStreakEntrySource } from "@/lib/repositories/streakEntries";

// ── Existing types (used by StreakHeader / StreakHeaderLoader) ────────────────

export interface StreakEntry {
  date: string;
  level: 0 | 1 | 2 | 3 | 4;
}

export interface StreakData {
  streak: number;
  longest: number;
  activeDays: number;
  weekCount: number;
  entries: StreakEntry[]; // length = weekCount * 7, chronological ascending
}

// ── Existing getStreakData() ──────────────────────────────────────────────────

export async function getStreakData(): Promise<
  { success: true; data: StreakData } | { success: false; error: string }
> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };

  // Pick first enrolled course (hub doc lives at /students/{uid}/courses/{courseId})
  const hub = await getFirstEnrolledCourse(uid);
  if (!hub) return { success: false, error: "no_courses" };

  const courseId = hub.data.courseId as string;
  const timezone = hub.data.timezone ?? "UTC";

  // Course streakRules
  const course = await getCourse(courseId);
  if (!course) return { success: false, error: "course_not_found" };
  const { streakRules } = course;

  // All streak entries ordered oldest-first
  const entries = await listStreakEntriesAsc(uid, courseId);

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

  // Build map: YYYY-MM-DD -> StreakEntryDoc
  const entryMap = new Map<string, StreakEntryDoc>();
  for (const { id, data } of entries) {
    entryMap.set(id, data);
  }

  return {
    success: true,
    data: computeStreakData(entryMap, streakRules, todayStr),
  };
}

// ── recordStreakActivity() ────────────────────────────────────────────────────

export async function recordStreakActivity({
  studentId,
  courseId,
  source,
}: {
  studentId: string;
  courseId: string;
  source: "challenge" | "checkin" | "sprintCard";
}): Promise<{ success: true; date: string } | { success: false; error: string }> {
  // 1. Verify session — uid must match studentId
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };

  if (uid !== studentId) return { success: false, error: "forbidden" };

  // 2. Fetch course timezone
  const course = await getCourse(courseId);
  if (!course) return { success: false, error: "course_not_found" };
  const { timezone } = course;

  // 3. Today's date string in course timezone
  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

  // 4. Mark the source active for today (merging with any existing entry)
  await upsertStreakEntrySource(uid, courseId, todayDate, source);

  return { success: true, date: todayDate };
}

// ── getStreakEntries() ────────────────────────────────────────────────────────

export async function getStreakEntries({
  studentId,
  courseId,
  days = 365,
}: {
  studentId: string;
  courseId: string;
  days?: number;
}): Promise<
  { success: true; entries: CalcEntry[] } | { success: false; error: string }
> {
  // 1. Verify session — uid must match studentId
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };

  if (uid !== studentId) return { success: false, error: "forbidden" };

  // 2. Query entries ordered newest-first, limited to `days`
  const rows = await listStreakEntriesDesc(uid, courseId, days);

  const entries: CalcEntry[] = rows.map(({ data }) => ({
    date: data.date,
    sources: {
      challenge: data.sources.challenge ?? false,
      checkin: data.sources.checkin ?? false,
      sprintCard: data.sources.sprintCard ?? false,
    },
  }));

  return { success: true, entries };
}
