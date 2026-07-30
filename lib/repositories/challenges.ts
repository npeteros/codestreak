import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { ChallengeDoc, ChallengeDifficulty, ChallengeKind } from "@/lib/firebase/types";

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

// The single non-draft DAILY challenge scheduled within [startOfDay, endOfDay).
// The kind=="DAILY" filter is load-bearing, not defensive: it keeps practice
// challenges (which never set scheduledFor) out of this query, and is only
// safe because scripts/backfillChallengeKind.ts has stamped kind onto every
// pre-existing ChallengeDoc (Firestore equality filters exclude docs missing
// the field entirely, so this would silently return nothing for un-backfilled data).
export async function getScheduledChallenge(
  courseId: string,
  startOfDay: Date,
  endOfDay: Date
): Promise<{ id: string; data: ChallengeDoc } | null> {
  const snap = await challengesCol(courseId)
    .where("scheduledFor", ">=", Timestamp.fromDate(startOfDay))
    .where("scheduledFor", "<", Timestamp.fromDate(endOfDay))
    .where("isDraft", "==", false)
    .where("kind", "==", "DAILY")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, data: doc.data() as ChallengeDoc };
}

// DAILY-only: this backs the Daily Challenge authoring page's "resume latest
// draft" feature, which assumes scheduledFor is present. Without the kind
// filter this could return a draft PRACTICE challenge instead (no
// scheduledFor) now that the two kinds share this collection.
export async function getLatestDraftChallenge(
  courseId: string
): Promise<{ id: string; data: ChallengeDoc } | null> {
  const snap = await challengesCol(courseId)
    .where("isDraft", "==", true)
    .where("kind", "==", "DAILY")
    .orderBy("createdAt", "desc")
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
    kind: "DAILY" satisfies ChallengeKind,
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

// Practice challenges never set scheduledFor (they're never day-gated) —
// the key is omitted from the write, not set to undefined, since
// lib/firebase/admin.ts doesn't enable ignoreUndefinedProperties.
export async function createPracticeChallenge(
  courseId: string,
  data: {
    title: string;
    description: string;
    difficulty: ChallengeDifficulty;
    topicTag: string;
    starterCode: string;
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
    kind: "PRACTICE" satisfies ChallengeKind,
    isDraft: data.isDraft,
    isAiGenerated: data.isAiGenerated,
    createdAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function updatePracticeChallenge(
  courseId: string,
  challengeId: string,
  data: {
    title: string;
    description: string;
    difficulty: ChallengeDifficulty;
    topicTag: string;
    starterCode: string;
    isDraft: boolean;
  }
): Promise<void> {
  await challengesCol(courseId).doc(challengeId).update({
    title: data.title,
    description: data.description,
    difficulty: data.difficulty,
    topicTag: data.topicTag,
    starterCode: data.starterCode,
    isDraft: data.isDraft,
  });
}

export async function listChallengesByKind(
  courseId: string,
  kind: ChallengeKind
): Promise<Array<{ id: string; data: ChallengeDoc }>> {
  const snap = await challengesCol(courseId).where("kind", "==", kind).get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as ChallengeDoc }));
}

// Published DAILY challenges scheduled before `cutoff` — the archive half of
// the Challenges module's browsable list. `cutoff` should be the same
// getStartOfDayUTC(timezone) boundary getTodayChallenge already uses, so
// today's/future-scheduled daily challenges stay exclusive to that page.
export async function listArchivedDailyChallenges(
  courseId: string,
  cutoff: Date
): Promise<Array<{ id: string; data: ChallengeDoc }>> {
  const snap = await challengesCol(courseId)
    .where("kind", "==", "DAILY")
    .where("isDraft", "==", false)
    .where("scheduledFor", "<", Timestamp.fromDate(cutoff))
    .get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as ChallengeDoc }));
}

export type BrowsableChallengeOrigin = "PRACTICE" | "DAILY_ARCHIVE";

// The full Challenges-module list: published practice challenges plus
// archived (past) daily challenges, newest first.
export async function listBrowsableChallenges(
  courseId: string,
  cutoff: Date
): Promise<Array<{ id: string; data: ChallengeDoc; origin: BrowsableChallengeOrigin }>> {
  const [practice, archivedDaily] = await Promise.all([
    listChallengesByKind(courseId, "PRACTICE"),
    listArchivedDailyChallenges(courseId, cutoff),
  ]);

  const merged = [
    ...practice
      .filter(({ data }) => !data.isDraft)
      .map((c) => ({ ...c, origin: "PRACTICE" as const })),
    ...archivedDaily.map((c) => ({ ...c, origin: "DAILY_ARCHIVE" as const })),
  ];

  merged.sort((a, b) => b.data.createdAt.toMillis() - a.data.createdAt.toMillis());
  return merged;
}

// Instructor-facing counterpart to listBrowsableChallenges: includes
// practice drafts too (instructors manage unpublished ones here), not just
// published practice challenges — archived daily challenges are never
// drafts by construction (listArchivedDailyChallenges already filters
// isDraft==false), so there's no draft-visibility question for that half.
export async function listManageablePracticeChallenges(
  courseId: string,
  cutoff: Date
): Promise<Array<{ id: string; data: ChallengeDoc; origin: BrowsableChallengeOrigin }>> {
  const [practice, archivedDaily] = await Promise.all([
    listChallengesByKind(courseId, "PRACTICE"),
    listArchivedDailyChallenges(courseId, cutoff),
  ]);

  const merged = [
    ...practice.map((c) => ({ ...c, origin: "PRACTICE" as const })),
    ...archivedDaily.map((c) => ({ ...c, origin: "DAILY_ARCHIVE" as const })),
  ];

  merged.sort((a, b) => b.data.createdAt.toMillis() - a.data.createdAt.toMillis());
  return merged;
}
