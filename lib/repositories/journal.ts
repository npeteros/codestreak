import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { JournalEntryDoc, JournalTriggerType } from "@/lib/firebase/types";

function journalCol(studentId: string, courseId: string) {
  return adminDb
    .collection("students")
    .doc(studentId)
    .collection("courses")
    .doc(courseId)
    .collection("journalEntries");
}

export async function createJournalEntry(
  studentId: string,
  courseId: string,
  content: string,
  triggerType: JournalTriggerType
): Promise<void> {
  await journalCol(studentId, courseId).add({
    content,
    triggerType,
    createdAt: FieldValue.serverTimestamp(),
  });
}

export async function listRecentJournalEntries(
  studentId: string,
  courseId: string,
  limit: number
): Promise<Array<{ id: string; data: JournalEntryDoc }>> {
  const snap = await journalCol(studentId, courseId)
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as JournalEntryDoc }));
}
