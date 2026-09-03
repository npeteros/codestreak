"use server";

import { getUid } from "@/lib/auth/session";
import { createJournalEntry, listRecentJournalEntries } from "@/lib/repositories/journal";
import {
  generateJournalReflection,
  type JournalContext,
} from "@/lib/services/openai/journalReflection";

// Called fire-and-forget from other server actions (uid already verified by caller).
export async function triggerJournalEntry(
  studentId: string,
  courseId: string,
  context: JournalContext
) {
  const content = await generateJournalReflection(context);
  if (!content) return;

  await createJournalEntry(studentId, courseId, content, context.triggerType);
}

export async function getJournalEntries(courseId: string) {
  const uid = await getUid();
  if (!uid) return { success: false as const, error: "unauthenticated" as const };

  const rows = await listRecentJournalEntries(uid, courseId, 20);

  const entries = rows.map(({ id, data: d }) => ({
    id,
    content: d.content,
    createdAt: d.createdAt.toISOString(),
    triggerType: d.triggerType,
  }));

  return { success: true as const, entries };
}
