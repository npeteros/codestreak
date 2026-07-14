"use server";

import { adminDb } from "@/lib/firebase/admin";
import type { StreakEntryDoc, CourseDoc } from "@/lib/firebase/types";
import type { StreakEntry as CalcEntry } from "@/lib/streak/calculate";
import { computeStreakData } from "./streak.calc";
import { getUid } from "@/lib/auth/session";

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
  const hubSnap = await adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .limit(1)
    .get();

  if (hubSnap.empty) return { success: false, error: "no_courses" };

  const hubDoc = hubSnap.docs[0].data();
  const courseId = hubDoc.courseId as string;
  const timezone = (hubDoc.timezone as string) ?? "UTC";

  // Course streakRules
  const courseSnap = await adminDb.collection("courses").doc(courseId).get();
  if (!courseSnap.exists) return { success: false, error: "course_not_found" };
  const { streakRules } = courseSnap.data() as CourseDoc;

  // All streak entries ordered oldest-first
  const entriesSnap = await adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .doc(courseId)
    .collection("streakEntries")
    .orderBy("date", "asc")
    .get();

  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

  // Build map: YYYY-MM-DD -> StreakEntryDoc
  const entryMap = new Map<string, StreakEntryDoc>();
  for (const doc of entriesSnap.docs) {
    entryMap.set(doc.id, doc.data() as StreakEntryDoc);
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
  const courseSnap = await adminDb.collection("courses").doc(courseId).get();
  if (!courseSnap.exists) return { success: false, error: "course_not_found" };
  const { timezone } = courseSnap.data() as CourseDoc;

  // 3. Today's date string in course timezone
  const todayDate = new Date().toLocaleDateString("en-CA", { timeZone: timezone });

  // 4. Reference the streak entry document (ID = date string)
  const entryRef = adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .doc(courseId)
    .collection("streakEntries")
    .doc(todayDate);

  const snap = await entryRef.get();

  if (snap.exists) {
    // Merge only the new source field — dot notation preserves sibling fields
    await entryRef.update({ [`sources.${source}`]: true });
  } else {
    // Create document with all sources initialised to false, then set the active one
    const sources: StreakEntryDoc["sources"] = {
      challenge: false,
      checkin: false,
      sprintCard: false,
    };
    sources[source] = true;
    await entryRef.set({ date: todayDate, courseId, sources });
  }

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
  const snap = await adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .doc(courseId)
    .collection("streakEntries")
    .orderBy("date", "desc")
    .limit(days)
    .get();

  const entries: CalcEntry[] = snap.docs.map((doc) => {
    const data = doc.data() as StreakEntryDoc;
    return {
      date: data.date,
      sources: {
        challenge: data.sources.challenge ?? false,
        checkin: data.sources.checkin ?? false,
        sprintCard: data.sources.sprintCard ?? false,
      },
    };
  });

  return { success: true, entries };
}
