"use server";

import { cookies } from "next/headers";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { SprintCardDoc, SprintCardStatus } from "@/lib/firebase/types";
import { recordStreakActivity } from "@/lib/actions/streak";
import { triggerJournalEntry } from "@/lib/actions/journal";

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

export async function getSprintCards(courseId: string) {
  const uid = await verifySession();
  if (!uid) return { success: false as const, error: "unauthenticated" as const };

  const snap = await adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .doc(courseId)
    .collection("sprintCards")
    .orderBy("createdAt", "asc")
    .get();

  const cards = snap.docs.map((doc) => {
    const d = doc.data() as SprintCardDoc;
    return {
      id: doc.id,
      title: d.title,
      description: d.description,
      status: d.status,
      isInstructorSeeded: d.isInstructorSeeded,
      milestoneId: d.milestoneId ?? null,
    };
  });

  return { success: true as const, cards };
}

export async function createSprintCard(
  courseId: string,
  data: { title: string; description?: string; milestoneId?: string }
) {
  const uid = await verifySession();
  if (!uid) return { success: false as const, error: "unauthenticated" as const };

  const now = FieldValue.serverTimestamp();
  const ref = await adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .doc(courseId)
    .collection("sprintCards")
    .add({
      title: data.title,
      description: data.description ?? "",
      status: "TODO" as SprintCardStatus,
      isInstructorSeeded: false,
      milestoneId: data.milestoneId ?? null,
      createdAt: now,
      updatedAt: now,
      movedAt: now,
    });

  return { success: true as const, id: ref.id };
}

export async function updateCardStatus(
  courseId: string,
  cardId: string,
  status: SprintCardStatus
) {
  const uid = await verifySession();
  if (!uid) return { success: false as const, error: "unauthenticated" as const };

  await adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .doc(courseId)
    .collection("sprintCards")
    .doc(cardId)
    .update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
      movedAt: FieldValue.serverTimestamp(),
    });

  if (status === "DONE") {
    recordStreakActivity({ studentId: uid, courseId, source: "sprintCard" }).catch(
      (err) => console.error("[streak] recordStreakActivity failed:", err)
    );
    triggerJournalEntry(uid, courseId, "SPRINT_CARD").catch(
      (err) => console.error("[journal] triggerJournalEntry failed:", err)
    );
  }

  return { success: true as const };
}
