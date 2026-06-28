"use server";

import { cookies } from "next/headers";
import { Timestamp } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type {
  CourseDoc,
  StreakEntryDoc,
  SprintCardDoc,
  JournalEntryDoc,
  JournalTriggerType,
  ChallengeDifficulty,
  ChallengeDoc,
} from "@/lib/firebase/types";
import type { StreakData } from "@/lib/actions/streak";

const COOKIE_NAME = "codestreak_session";
const WEEKS_COUNT = 18;

function getStartOfDayUTC(tz: string): Date {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-CA", { timeZone: tz });
  const noonUTC = new Date(dateStr + "T12:00:00Z");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(noonUTC);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value);
  const [lYear, lMonth, lDay, lHour, lMinute] = [
    get("year"),
    get("month"),
    get("day"),
    get("hour"),
    get("minute"),
  ];
  const utcOffsetMs =
    noonUTC.getTime() - Date.UTC(lYear, lMonth - 1, lDay, lHour, lMinute);
  const [dsYear, dsMonth, dsDay] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(dsYear, dsMonth - 1, dsDay) + utcOffsetMs);
}

export interface OverviewSummary {
  streakData: StreakData;
  challenge: {
    id: string;
    title: string;
    difficulty: ChallengeDifficulty;
    alreadySubmitted: boolean;
  } | null;
  latestCheckIn: { note: string; createdAt: string } | null;
  sprint: { todo: number; inProgress: number; done: number };
  latestJournal: {
    content: string;
    triggerType: JournalTriggerType;
    createdAt: string;
  } | null;
}

export async function getOverviewSummary(
  courseId: string
): Promise<
  ({ success: true } & OverviewSummary) | { success: false; error: string }
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

  const courseSnap = await adminDb.collection("courses").doc(courseId).get();
  if (!courseSnap.exists) return { success: false, error: "course_not_found" };
  const { timezone, streakRules } = courseSnap.data() as CourseDoc;

  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: timezone,
  });
  const startOfDay = getStartOfDayUTC(timezone);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const studentCoursePath = adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .doc(courseId);

  const [streakSnap, challengeSnap, checkInSnap, sprintSnap, journalSnap] =
    await Promise.all([
      studentCoursePath.collection("streakEntries").orderBy("date", "asc").get(),
      adminDb
        .collection("courses")
        .doc(courseId)
        .collection("challenges")
        .where("scheduledFor", ">=", Timestamp.fromDate(startOfDay))
        .where("scheduledFor", "<", Timestamp.fromDate(endOfDay))
        .where("isDraft", "==", false)
        .limit(1)
        .get(),
      studentCoursePath
        .collection("checkIns")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get(),
      studentCoursePath.collection("sprintCards").get(),
      studentCoursePath
        .collection("journalEntries")
        .orderBy("createdAt", "desc")
        .limit(1)
        .get(),
    ]);

  // ── Streak computation ───────────────────────────────────────────────────────

  const countsForStreak = (e: StreakEntryDoc) =>
    (streakRules.challenge && e.sources.challenge) ||
    (streakRules.checkin && e.sources.checkin) ||
    (streakRules.sprintCard && e.sources.sprintCard);

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

  const entryMap = new Map<string, StreakEntryDoc>();
  for (const doc of streakSnap.docs) {
    entryMap.set(doc.id, doc.data() as StreakEntryDoc);
  }

  const activeDates = new Set<string>();
  for (const [date, entry] of entryMap) {
    if (countsForStreak(entry)) activeDates.add(date);
  }

  const todayUTC = new Date(todayStr + "T12:00:00Z");

  let streak = 0;
  const cur = new Date(todayUTC);
  if (!activeDates.has(todayStr)) cur.setUTCDate(cur.getUTCDate() - 1);
  while (true) {
    const ds = cur.toISOString().slice(0, 10);
    if (!activeDates.has(ds)) break;
    streak++;
    cur.setUTCDate(cur.getUTCDate() - 1);
  }

  let longest = 0,
    run = 0;
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

  const cellCount = WEEKS_COUNT * 7;
  const startDate = new Date(todayUTC);
  startDate.setUTCDate(startDate.getUTCDate() - (cellCount - 1));
  const heatEntries: StreakData["entries"] = [];
  for (let i = 0; i < cellCount; i++) {
    const d = new Date(startDate);
    d.setUTCDate(d.getUTCDate() + i);
    const ds = d.toISOString().slice(0, 10);
    const e = entryMap.get(ds);
    heatEntries.push({ date: ds, level: e ? levelFor(e) : 0 });
  }

  const streakData: StreakData = {
    streak,
    longest,
    activeDays: activeDates.size,
    weekCount: WEEKS_COUNT,
    entries: heatEntries,
  };

  // ── Challenge card ───────────────────────────────────────────────────────────

  let challenge: OverviewSummary["challenge"] = null;
  if (!challengeSnap.empty) {
    const chalDoc = challengeSnap.docs[0];
    const chalData = chalDoc.data() as ChallengeDoc;
    const subSnap = await studentCoursePath
      .collection("challengeSubmissions")
      .where("challengeId", "==", chalDoc.id)
      .limit(1)
      .get();
    challenge = {
      id: chalDoc.id,
      title: chalData.title,
      difficulty: chalData.difficulty,
      alreadySubmitted: !subSnap.empty,
    };
  }

  // ── Check-in card ────────────────────────────────────────────────────────────

  let latestCheckIn: OverviewSummary["latestCheckIn"] = null;
  if (!checkInSnap.empty) {
    const d = checkInSnap.docs[0].data();
    const ts = d.createdAt as Timestamp | null;
    latestCheckIn = {
      note: d.note as string,
      createdAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
    };
  }

  // ── Sprint counts ────────────────────────────────────────────────────────────

  let todo = 0,
    inProgress = 0,
    done = 0;
  for (const doc of sprintSnap.docs) {
    const s = (doc.data() as SprintCardDoc).status;
    if (s === "TODO") todo++;
    else if (s === "IN_PROGRESS") inProgress++;
    else if (s === "DONE") done++;
  }

  // ── Journal card ─────────────────────────────────────────────────────────────

  let latestJournal: OverviewSummary["latestJournal"] = null;
  if (!journalSnap.empty) {
    const d = journalSnap.docs[0].data() as JournalEntryDoc;
    const ts = d.createdAt as Timestamp | null;
    latestJournal = {
      content: d.content,
      triggerType: d.triggerType,
      createdAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
    };
  }

  return {
    success: true,
    streakData,
    challenge,
    latestCheckIn,
    sprint: { todo, inProgress, done },
    latestJournal,
  };
}
