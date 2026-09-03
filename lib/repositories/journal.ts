import { JournalEntry } from "@/lib/db/models";
import type { JournalEntryDoc, JournalTriggerType } from "@/lib/types";

function toDoc(row: JournalEntry): JournalEntryDoc {
  return { content: row.content, createdAt: row.createdAt, triggerType: row.triggerType };
}

export async function createJournalEntry(
  studentId: string,
  courseId: string,
  content: string,
  triggerType: JournalTriggerType
): Promise<void> {
  await JournalEntry.create({ studentId, courseId, content, triggerType });
}

export async function listRecentJournalEntries(
  studentId: string,
  courseId: string,
  limit: number
): Promise<Array<{ id: string; data: JournalEntryDoc }>> {
  const rows = await JournalEntry.findAll({
    where: { studentId, courseId },
    order: [["createdAt", "DESC"]],
    limit,
  });
  return rows.map((row) => ({ id: row.id, data: toDoc(row) }));
}
