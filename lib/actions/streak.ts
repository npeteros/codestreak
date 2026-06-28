"use server";

import { cookies } from "next/headers";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { StreakEntryDoc, CourseDoc } from "@/lib/firebase/types";
import type { StreakEntry as CalcEntry } from "@/lib/streak/calculate";

const COOKIE_NAME = "codestreak_session";
const WEEKS_COUNT = 18;

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
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session?.value) return { success: false, error: "unauthenticated" };

  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(session.value, true);
    uid = decoded.uid;
  } catch {
    return { success: false, error: "unauthenticated" };
  }

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

  // True if this entry counts toward the streak given course rules
  const countsForStreak = (e: StreakEntryDoc) =>
    (streakRules.challenge && e.sources.challenge) ||
    (streakRules.checkin && e.sources.checkin) ||
    (streakRules.sprintCard && e.sources.sprintCard);

  // Heatmap intensity: number of active sources mapped to 0–4 scale
  const levelFor = (e: StreakEntryDoc): 0 | 1 | 2 | 3 | 4 => {
    const n =
      (streakRules.challenge && e.sources.challenge ? 1 : 0) +
      (streakRules.checkin && e.sources.checkin ? 1 : 0) +
      (streakRules.sprintCard && e.sources.sprintCard ? 1 : 0);
    if (n === 0) return 0;
    if (n === 1) return 2;
    if (n === 2) return 3;
    return 4;
  };

  // Set of dates with at least one streak-counting source
  const activeDates = new Set<string>();
  for (const [date, entry] of entryMap) {
    if (countsForStreak(entry)) activeDates.add(date);
  }

  // Current consecutive streak (walk backwards from today)
  let streak = 0;
  const todayUTC = new Date(todayStr + "T12:00:00Z");
  const cur = new Date(todayUTC);
  if (!activeDates.has(todayStr)) cur.setUTCDate(cur.getUTCDate() - 1);
  while (true) {
    const ds = cur.toISOString().slice(0, 10);
    if (!activeDates.has(ds)) break;
    streak++;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }

  // Best (longest) streak ever
  let longest = 0;
  let run = 0;
  let prev: Date | null = null;
  for (const ds of [...activeDates].sort()) {
    const d = new Date(ds + "T12:00:00Z");
    if (prev && d.getTime() - prev.getTime() === 86_400_000) {
      run++;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
    prev = d;
  }

  // Heatmap grid for the last WEEKS_COUNT weeks
  const cellCount = WEEKS_COUNT * 7;
  const startDate = new Date(todayUTC);
  startDate.setUTCDate(startDate.getUTCDate() - (cellCount - 1));

  const entries: StreakEntry[] = [];
  for (let i = 0; i < cellCount; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const e = entryMap.get(ds);
    entries.push({ date: ds, level: e ? levelFor(e) : 0 });
  }

  return {
    success: true,
    data: {
      streak,
      longest,
      activeDays: activeDates.size,
      weekCount: WEEKS_COUNT,
      entries,
    },
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
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session?.value) return { success: false, error: "unauthenticated" };

  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(session.value, true);
    uid = decoded.uid;
  } catch {
    return { success: false, error: "unauthenticated" };
  }

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
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session?.value) return { success: false, error: "unauthenticated" };

  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(session.value, true);
    uid = decoded.uid;
  } catch {
    return { success: false, error: "unauthenticated" };
  }

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
