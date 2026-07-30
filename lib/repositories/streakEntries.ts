import { adminDb } from "@/lib/firebase/admin";
import type { StreakEntryDoc } from "@/lib/firebase/types";

function streakEntriesCol(studentId: string, courseId: string) {
  return adminDb
    .collection("students")
    .doc(studentId)
    .collection("courses")
    .doc(courseId)
    .collection("streakEntries");
}

export async function listStreakEntriesDesc(
  studentId: string,
  courseId: string,
  limit: number
): Promise<Array<{ id: string; data: StreakEntryDoc }>> {
  const snap = await streakEntriesCol(studentId, courseId)
    .orderBy("date", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as StreakEntryDoc }));
}

// getLongestStreak needs full history (an all-time-longest streak can
// predate any realistic window), so this can't take a tight limit like the
// roster's 365-day cap without changing that result. SAFETY_CAP bounds the
// pathological/malicious case (a decade+ of daily entries) without
// affecting any real bootcamp-length account; past the cap, oldest-first
// ordering means it would start truncating recent days before old ones, so
// it's a defensive ceiling, not a real windowing strategy.
const SAFETY_CAP_DAYS = 3650;

export async function listStreakEntriesAsc(
  studentId: string,
  courseId: string
): Promise<Array<{ id: string; data: StreakEntryDoc }>> {
  const snap = await streakEntriesCol(studentId, courseId)
    .orderBy("date", "asc")
    .limit(SAFETY_CAP_DAYS)
    .get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as StreakEntryDoc }));
}

// Marks `source` active for `date`, merging with any existing entry (other
// sources for the same day are preserved) or creating a fresh one.
export async function upsertStreakEntrySource(
  studentId: string,
  courseId: string,
  date: string,
  source: "challenge" | "checkin" | "sprintCard" | "practice"
): Promise<void> {
  const entryRef = streakEntriesCol(studentId, courseId).doc(date);
  const snap = await entryRef.get();

  if (snap.exists) {
    await entryRef.update({ [`sources.${source}`]: true });
  } else {
    const sources: StreakEntryDoc["sources"] = {
      challenge: false,
      checkin: false,
      sprintCard: false,
      practice: false,
    };
    sources[source] = true;
    await entryRef.set({ date, courseId, sources });
  }
}
