"use server";

import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { JournalEntryDoc, JournalTriggerType } from "@/lib/firebase/types";
import OpenAI from "openai";

const COOKIE_NAME = "codestreak_session";

async function verifySession(): Promise<string | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE_NAME);
  if (!session?.value) return null;
  try {
    const decoded = await adminAuth.verifySessionCookie(session.value, true);
    return decoded.uid;
  } catch {
    return null;
  }
}

const TRIGGER_LABEL: Record<JournalTriggerType, string> = {
  CHALLENGE: "daily coding challenge",
  CHECKIN: "daily check-in",
  SPRINT_CARD: "sprint card completion",
};

// Called fire-and-forget from other server actions (uid already verified by caller).
export async function triggerJournalEntry(
  studentId: string,
  courseId: string,
  triggerType: JournalTriggerType
) {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a thoughtful coding coach writing brief journal reflections for a student. " +
          "Write in second person, encouraging but specific — no generic affirmations. " +
          "Focus on craft and the habit of showing up. Keep it to 2–3 sentences.",
      },
      {
        role: "user",
        content: `Write a short journal reflection for a student who just completed their ${TRIGGER_LABEL[triggerType]}.`,
      },
    ],
    max_tokens: 120,
    temperature: 0.85,
  });

  const content = completion.choices[0]?.message?.content?.trim();
  if (!content) return;

  await adminDb
    .collection("students")
    .doc(studentId)
    .collection("courses")
    .doc(courseId)
    .collection("journalEntries")
    .add({
      content,
      triggerType,
      createdAt: FieldValue.serverTimestamp(),
    });
}

export async function getJournalEntries(courseId: string) {
  const uid = await verifySession();
  if (!uid) return { success: false as const, error: "unauthenticated" as const };

  const snap = await adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .doc(courseId)
    .collection("journalEntries")
    .orderBy("createdAt", "desc")
    .limit(20)
    .get();

  const entries = snap.docs.map((doc) => {
    const d = doc.data() as JournalEntryDoc;
    return {
      id: doc.id,
      content: d.content,
      createdAt: (d.createdAt?.toDate() ?? new Date()).toISOString(),
      triggerType: d.triggerType,
    };
  });

  return { success: true as const, entries };
}
