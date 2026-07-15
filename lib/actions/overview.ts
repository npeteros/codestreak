"use server";

import type { Timestamp } from "firebase-admin/firestore";
import type { StreakEntryDoc, JournalTriggerType, ChallengeDifficulty } from "@/lib/firebase/types";
import type { StreakData } from "@/lib/actions/streak";
import { computeOverviewStreakData } from "./overview.calc";
import { getUid } from "@/lib/auth/session";
import { getCourse } from "@/lib/repositories/courses";
import { listStreakEntriesAsc } from "@/lib/repositories/streakEntries";
import { getScheduledChallenge } from "@/lib/repositories/challenges";
import { findSubmissionForChallenge } from "@/lib/repositories/submissions";
import { listRecentCheckIns } from "@/lib/repositories/checkins";
import { listSprintCards } from "@/lib/repositories/sprintCards";
import { listRecentJournalEntries } from "@/lib/repositories/journal";
import { getStartOfDayUTC } from "@/lib/domain/time";

export interface OverviewSummary {
  streakData: StreakData;
  challenge: {
    id: string;
    title: string;
    difficulty: ChallengeDifficulty;
    alreadySubmitted: boolean;
  } | null;
  latestCheckIn: { note: string; createdAt: string } | null;
  sprint: { todo: number; inProgress: number; done: number };
  latestJournal: {
    content: string;
    triggerType: JournalTriggerType;
    createdAt: string;
  } | null;
}

export async function getOverviewSummary(
  courseId: string
): Promise<
  ({ success: true } & OverviewSummary) | { success: false; error: string }
> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(courseId);
  if (!course) return { success: false, error: "course_not_found" };
  const { timezone, streakRules } = course;

  const todayStr = new Date().toLocaleDateString("en-CA", {
    timeZone: timezone,
  });
  const startOfDay = getStartOfDayUTC(timezone);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const [streakEntries, scheduledChallenge, recentCheckIns, sprintCards, recentJournal] =
    await Promise.all([
      listStreakEntriesAsc(uid, courseId),
      getScheduledChallenge(courseId, startOfDay, endOfDay),
      listRecentCheckIns(uid, courseId, 1),
      listSprintCards(uid, courseId),
      listRecentJournalEntries(uid, courseId, 1),
    ]);

  // ── Streak computation ───────────────────────────────────────────────────────

  const entryMap = new Map<string, StreakEntryDoc>();
  for (const { id, data } of streakEntries) {
    entryMap.set(id, data);
  }

  const streakData = computeOverviewStreakData(entryMap, streakRules, todayStr);

  // ── Challenge card ───────────────────────────────────────────────────────────

  let challenge: OverviewSummary["challenge"] = null;
  if (scheduledChallenge) {
    const submission = await findSubmissionForChallenge(
      uid,
      courseId,
      scheduledChallenge.id
    );
    challenge = {
      id: scheduledChallenge.id,
      title: scheduledChallenge.data.title,
      difficulty: scheduledChallenge.data.difficulty,
      alreadySubmitted: submission !== null,
    };
  }

  // ── Check-in card ────────────────────────────────────────────────────────────

  let latestCheckIn: OverviewSummary["latestCheckIn"] = null;
  if (recentCheckIns.length > 0) {
    const d = recentCheckIns[0].data;
    const ts = d.createdAt as Timestamp | null;
    latestCheckIn = {
      note: d.note,
      createdAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
    };
  }

  // ── Sprint counts ────────────────────────────────────────────────────────────

  let todo = 0,
    inProgress = 0,
    done = 0;
  for (const card of sprintCards) {
    if (card.status === "TODO") todo++;
    else if (card.status === "IN_PROGRESS") inProgress++;
    else if (card.status === "DONE") done++;
  }

  // ── Journal card ─────────────────────────────────────────────────────────────

  let latestJournal: OverviewSummary["latestJournal"] = null;
  if (recentJournal.length > 0) {
    const d = recentJournal[0].data;
    const ts = d.createdAt as Timestamp | null;
    latestJournal = {
      content: d.content,
      triggerType: d.triggerType,
      createdAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
    };
  }

  return {
    success: true,
    streakData,
    challenge,
    latestCheckIn,
    sprint: { todo, inProgress, done },
    latestJournal,
  };
}
