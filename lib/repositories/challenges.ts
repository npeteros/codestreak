import { Op } from "sequelize";
import { Challenge } from "@/lib/db/models";
import type { ChallengeDoc, ChallengeDifficulty, ChallengeKind } from "@/lib/types";

function toDoc(row: Challenge): ChallengeDoc {
  return {
    title: row.title,
    description: row.description,
    difficulty: row.difficulty,
    topicTag: row.topicTag,
    starterCode: row.starterCode,
    scheduledFor: row.scheduledFor ?? undefined,
    kind: row.kind,
    isAiGenerated: row.isAiGenerated,
    isDraft: row.isDraft,
    createdAt: row.createdAt,
  };
}

export async function getChallenge(
  courseId: string,
  challengeId: string
): Promise<ChallengeDoc | null> {
  const row = await Challenge.findOne({ where: { id: challengeId, courseId } });
  return row ? toDoc(row) : null;
}

export async function listChallenges(
  courseId: string
): Promise<Array<{ id: string; data: ChallengeDoc }>> {
  const rows = await Challenge.findAll({ where: { courseId } });
  return rows.map((row) => ({ id: row.id, data: toDoc(row) }));
}

// The single non-draft DAILY challenge scheduled within [startOfDay, endOfDay).
// kind=="DAILY" keeps practice challenges (no scheduledFor) out of this query.
export async function getScheduledChallenge(
  courseId: string,
  startOfDay: Date,
  endOfDay: Date
): Promise<{ id: string; data: ChallengeDoc } | null> {
  const row = await Challenge.findOne({
    where: {
      courseId,
      kind: "DAILY",
      isDraft: false,
      scheduledFor: { [Op.gte]: startOfDay, [Op.lt]: endOfDay },
    },
  });
  return row ? { id: row.id, data: toDoc(row) } : null;
}

// DAILY-only, so scheduledFor is guaranteed present for the caller.
export async function getLatestDraftChallenge(
  courseId: string
): Promise<{ id: string; data: ChallengeDoc } | null> {
  const row = await Challenge.findOne({
    where: { courseId, isDraft: true, kind: "DAILY" },
    order: [["createdAt", "DESC"]],
  });
  return row ? { id: row.id, data: toDoc(row) } : null;
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
  const row = await Challenge.create({
    courseId,
    title: data.title,
    description: data.description,
    difficulty: data.difficulty,
    topicTag: data.topicTag,
    starterCode: data.starterCode,
    scheduledFor: data.scheduledFor,
    kind: "DAILY" satisfies ChallengeKind,
    isDraft: data.isDraft,
    isAiGenerated: data.isAiGenerated,
  });
  return row.id;
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
  await Challenge.update(
    {
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      topicTag: data.topicTag,
      starterCode: data.starterCode,
      scheduledFor: data.scheduledFor,
      isDraft: data.isDraft,
    },
    { where: { id: challengeId, courseId } }
  );
}

export async function deleteChallenge(
  courseId: string,
  challengeId: string
): Promise<void> {
  await Challenge.destroy({ where: { id: challengeId, courseId } });
}

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
  const row = await Challenge.create({
    courseId,
    title: data.title,
    description: data.description,
    difficulty: data.difficulty,
    topicTag: data.topicTag,
    starterCode: data.starterCode,
    scheduledFor: null,
    kind: "PRACTICE" satisfies ChallengeKind,
    isDraft: data.isDraft,
    isAiGenerated: data.isAiGenerated,
  });
  return row.id;
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
  await Challenge.update(
    {
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      topicTag: data.topicTag,
      starterCode: data.starterCode,
      isDraft: data.isDraft,
    },
    { where: { id: challengeId, courseId } }
  );
}

export type BrowsableChallengeOrigin = "PRACTICE" | "DAILY_ARCHIVE";

export interface PracticePageFilters {
  difficulty?: ChallengeDifficulty;
}

// `limit` should be requested as pageSize+1 to detect more pages (see lib/domain/practiceMerge.ts).
export async function listPracticeChallengesPage(
  courseId: string,
  opts: {
    limit: number;
    cursor: string | null;
    // undefined = both drafts and published (instructor "All"); students always pass false.
    isDraft?: boolean;
    sortDir: "asc" | "desc";
  } & PracticePageFilters
): Promise<Array<{ id: string; data: ChallengeDoc }>> {
  const cursorOp = opts.sortDir === "asc" ? Op.gt : Op.lt;
  const rows = await Challenge.findAll({
    where: {
      courseId,
      kind: "PRACTICE",
      ...(opts.isDraft !== undefined ? { isDraft: opts.isDraft } : {}),
      ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
      ...(opts.cursor ? { createdAt: { [cursorOp]: new Date(opts.cursor) } } : {}),
    },
    order: [["createdAt", opts.sortDir === "asc" ? "ASC" : "DESC"]],
    limit: opts.limit,
  });
  return rows.map((row) => ({ id: row.id, data: toDoc(row) }));
}

// Published DAILY challenges scheduled before `cutoff` — today's/future ones
// stay exclusive to the Daily Challenge page.
export async function listArchivedDailyChallengesPage(
  courseId: string,
  cutoff: Date,
  opts: {
    limit: number;
    cursor: string | null;
    sortDir: "asc" | "desc";
  } & PracticePageFilters
): Promise<Array<{ id: string; data: ChallengeDoc }>> {
  // cutoff and a descending cursor both use Op.lt, which would collide as
  // two keys on one object — but the cursor is already < cutoff by
  // construction, so using it alone once present is equivalent.
  const scheduledForBound =
    opts.sortDir === "desc"
      ? { [Op.lt]: opts.cursor ? new Date(opts.cursor) : cutoff }
      : { [Op.lt]: cutoff, ...(opts.cursor ? { [Op.gt]: new Date(opts.cursor) } : {}) };

  const rows = await Challenge.findAll({
    where: {
      courseId,
      kind: "DAILY",
      isDraft: false,
      scheduledFor: scheduledForBound,
      ...(opts.difficulty ? { difficulty: opts.difficulty } : {}),
    },
    order: [["scheduledFor", opts.sortDir === "asc" ? "ASC" : "DESC"]],
    limit: opts.limit,
  });
  return rows.map((row) => ({ id: row.id, data: toDoc(row) }));
}
