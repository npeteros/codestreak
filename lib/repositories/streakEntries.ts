import { StreakEntry } from "@/lib/db/models";
import type { StreakEntryDoc } from "@/lib/types";

function toDoc(row: StreakEntry): StreakEntryDoc {
  return {
    date: row.date,
    sources: {
      challenge: row.challenge,
      checkin: row.checkin,
      sprintCard: row.sprintCard,
      practice: row.practice,
    },
  };
}

export async function listStreakEntriesDesc(
  studentId: string,
  courseId: string,
  limit: number
): Promise<Array<{ id: string; data: StreakEntryDoc }>> {
  const rows = await StreakEntry.findAll({
    where: { studentId, courseId },
    order: [["date", "DESC"]],
    limit,
  });
  return rows.map((row) => ({ id: row.date, data: toDoc(row) }));
}

// Full history, not a tight window — getLongestStreak needs it. This is a
// defensive ceiling against pathological history size, not real pagination.
const SAFETY_CAP_DAYS = 3650;

export async function listStreakEntriesAsc(
  studentId: string,
  courseId: string
): Promise<Array<{ id: string; data: StreakEntryDoc }>> {
  const rows = await StreakEntry.findAll({
    where: { studentId, courseId },
    order: [["date", "ASC"]],
    limit: SAFETY_CAP_DAYS,
  });
  return rows.map((row) => ({ id: row.date, data: toDoc(row) }));
}

// Marks `source` active for `date`, preserving other sources already set for
// that day. Each branch is a single atomic UPSERT — no transaction needed.
export async function upsertStreakEntrySource(
  studentId: string,
  courseId: string,
  date: string,
  source: "challenge" | "checkin" | "sprintCard" | "practice"
): Promise<void> {
  const base = { studentId, courseId, date };
  switch (source) {
    case "challenge":
      await StreakEntry.upsert({ ...base, challenge: true });
      break;
    case "checkin":
      await StreakEntry.upsert({ ...base, checkin: true });
      break;
    case "sprintCard":
      await StreakEntry.upsert({ ...base, sprintCard: true });
      break;
    case "practice":
      await StreakEntry.upsert({ ...base, practice: true });
      break;
  }
}
