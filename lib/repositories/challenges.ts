import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { ChallengeDoc, ChallengeDifficulty } from "@/lib/firebase/types";

function challengesCol(courseId: string) {
  return adminDb.collection("courses").doc(courseId).collection("challenges");
}

export async function getChallenge(
  courseId: string,
  challengeId: string
): Promise<ChallengeDoc | null> {
  const snap = await challengesCol(courseId).doc(challengeId).get();
  return snap.exists ? (snap.data() as ChallengeDoc) : null;
}

export async function listChallenges(
  courseId: string
): Promise<Array<{ id: string; data: ChallengeDoc }>> {
  const snap = await challengesCol(courseId).get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as ChallengeDoc }));
}

// The single non-draft challenge scheduled within [startOfDay, endOfDay).
export async function getScheduledChallenge(
  courseId: string,
  startOfDay: Date,
  endOfDay: Date
): Promise<{ id: string; data: ChallengeDoc } | null> {
  const snap = await challengesCol(courseId)
    .where("scheduledFor", ">=", Timestamp.fromDate(startOfDay))
    .where("scheduledFor", "<", Timestamp.fromDate(endOfDay))
    .where("isDraft", "==", false)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() as ChallengeDoc };
}

export async function createChallenge(
  courseId: string,
  data: {
    title: string;
    description: string;
    difficulty: ChallengeDifficulty;
    topicTag: string;
    starterCode: string;
    scheduledFor: Date;
    isDraft: boolean;
    isAiGenerated: boolean;
  }
): Promise<string> {
  const ref = await challengesCol(courseId).add({
    title: data.title,
    description: data.description,
    difficulty: data.difficulty,
    topicTag: data.topicTag,
    starterCode: data.starterCode,
    scheduledFor: Timestamp.fromDate(data.scheduledFor),
    isDraft: data.isDraft,
    isAiGenerated: data.isAiGenerated,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updateChallenge(
  courseId: string,
  challengeId: string,
  data: {
    title: string;
    description: string;
    difficulty: ChallengeDifficulty;
    topicTag: string;
    starterCode: string;
    scheduledFor: Date;
    isDraft: boolean;
  }
): Promise<void> {
  await challengesCol(courseId).doc(challengeId).update({
    title: data.title,
    description: data.description,
    difficulty: data.difficulty,
    topicTag: data.topicTag,
    starterCode: data.starterCode,
    scheduledFor: Timestamp.fromDate(data.scheduledFor),
    isDraft: data.isDraft,
  });
}

export async function deleteChallenge(
  courseId: string,
  challengeId: string
): Promise<void> {
  await challengesCol(courseId).doc(challengeId).delete();
}
