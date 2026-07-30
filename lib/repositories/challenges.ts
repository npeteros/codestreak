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

export type BrowsableChallengeOrigin = "PRACTICE" | "DAILY_ARCHIVE";

export interface PracticePageFilters {
  difficulty?: ChallengeDifficulty;
}

// Cursor-paginated practice-branch query backing the Practice module's list
// (student and instructor). Ordered by createdAt since this branch carries no
// range filter — free to sort on anything, unlike the archived-daily branch
// below. `limit` should be requested as pageSize+1 by the caller to detect
// whether more results exist past this page (see lib/domain/practiceMerge.ts).
export async function listPracticeChallengesPage(
  courseId: string,
  opts: {
    limit: number;
    cursor: string | null;
    // undefined = drafts and published both included (instructor "All"),
    // true = drafts only, false = published only (students always pass false).
    isDraft?: boolean;
    sortDir: "asc" | "desc";
  } & PracticePageFilters
): Promise<Array<{ id: string; data: ChallengeDoc }>> {
  let query = challengesCol(courseId).where("kind", "==", "PRACTICE");
  if (opts.isDraft !== undefined) query = query.where("isDraft", "==", opts.isDraft);
  if (opts.difficulty) query = query.where("difficulty", "==", opts.difficulty);
  query = query.orderBy("createdAt", opts.sortDir).limit(opts.limit);
  if (opts.cursor) query = query.startAfter(Timestamp.fromDate(new Date(opts.cursor)));

  const snap = await query.get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as ChallengeDoc }));
}

// Cursor-paginated archived-daily-branch query: published DAILY challenges
// scheduled before `cutoff` (today's/future-scheduled ones stay exclusive to
// the Daily Challenge page). Ordered by scheduledFor, not createdAt — Firestore
// requires the first orderBy to match a range-filtered field, and
// `scheduledFor < cutoff` is exactly that; scheduledFor tracks chronological
// order for daily challenges just as well as createdAt would.
export async function listArchivedDailyChallengesPage(
  courseId: string,
  cutoff: Date,
  opts: {
    limit: number;
    cursor: string | null;
    sortDir: "asc" | "desc";
  } & PracticePageFilters
): Promise<Array<{ id: string; data: ChallengeDoc }>> {
  let query = challengesCol(courseId)
    .where("kind", "==", "DAILY")
    .where("isDraft", "==", false);
  if (opts.difficulty) query = query.where("difficulty", "==", opts.difficulty);
  query = query
    .where("scheduledFor", "<", Timestamp.fromDate(cutoff))
    .orderBy("scheduledFor", opts.sortDir)
    .limit(opts.limit);
  if (opts.cursor) query = query.startAfter(Timestamp.fromDate(new Date(opts.cursor)));

  const snap = await query.get();
  return snap.docs.map((d) => ({ id: d.id, data: d.data() as ChallengeDoc }));
}
