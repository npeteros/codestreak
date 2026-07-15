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

export async function listStreakEntriesAsc(
  studentId: string,
  courseId: string
): Promise<Array<{ id: string; data: StreakEntryDoc }>> {
  const snap = await streakEntriesCol(studentId, courseId).orderBy("date", "asc").get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as StreakEntryDoc }));
}

// Marks `source` active for `date`, merging with any existing entry (other
// sources for the same day are preserved) or creating a fresh one.
export async function upsertStreakEntrySource(
  studentId: string,
  courseId: string,
  date: string,
  source: "challenge" | "checkin" | "sprintCard"
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
    };
    sources[source] = true;
    await entryRef.set({ date, courseId, sources });
  }
}
