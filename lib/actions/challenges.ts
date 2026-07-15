"use server";

import type { ChallengeDifficulty } from "@/lib/firebase/types";
import { recordStreakActivity } from "@/lib/actions/streak";
import { triggerJournalEntry } from "@/lib/actions/journal";
import { getUid } from "@/lib/auth/session";
import { getCourse } from "@/lib/repositories/courses";
import { getChallenge, getScheduledChallenge } from "@/lib/repositories/challenges";
import { findSubmissionForChallenge, upsertSubmission } from "@/lib/repositories/submissions";

function getStartOfDayUTC(tz: string): Date {
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-CA", { timeZone: tz });
  const noonUTC = new Date(dateStr + "T12:00:00Z");
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  }).formatToParts(noonUTC);
  const get = (type: string) =>
    parseInt(parts.find((p) => p.type === type)!.value);
  const [lYear, lMonth, lDay, lHour, lMinute] = [
    get("year"), get("month"), get("day"), get("hour"), get("minute"),
  ];
  const utcOffsetMs =
    noonUTC.getTime() - Date.UTC(lYear, lMonth - 1, lDay, lHour, lMinute);
  const [dsYear, dsMonth, dsDay] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(dsYear, dsMonth - 1, dsDay) + utcOffsetMs);
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
  }
) {
  return { success: false as const, error: "not implemented" as const };
}

export async function getTodayChallenge(courseId: string) {
  const uid = await getUid();
  if (!uid) return { success: false as const, error: "unauthenticated" as const };

  const course = await getCourse(courseId);
  if (!course) return { success: false as const, error: "course_not_found" as const };
  const { timezone } = course;

  const startOfDay = getStartOfDayUTC(timezone);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const scheduled = await getScheduledChallenge(courseId, startOfDay, endOfDay);

  if (!scheduled) {
    return {
      success: true as const,
      challenge: null,
      alreadySubmitted: false,
      submittedCode: null,
    };
  }

  const { id, data } = scheduled;

  const submission = await findSubmissionForChallenge(uid, courseId, id);

  return {
    success: true as const,
    challenge: {
      id,
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      topicTag: data.topicTag,
      starterCode: data.starterCode,
    },
    alreadySubmitted: submission !== null,
    submittedCode: submission?.data.code ?? null,
  };
}

export async function submitChallenge(
  courseId: string,
  challengeId: string,
  code: string
) {
  const uid = await getUid();
  if (!uid) return { success: false as const, error: "unauthenticated" as const };

  await upsertSubmission(uid, courseId, challengeId, code);

  recordStreakActivity({ studentId: uid, courseId, source: "challenge" }).catch(
    (err) => console.error("[streak] recordStreakActivity failed:", err)
  );

  getChallenge(courseId, challengeId)
    .then((challenge) => {
      if (!challenge) return;
      return triggerJournalEntry(uid, courseId, {
        triggerType: "CHALLENGE",
        title: challenge.title,
        difficulty: challenge.difficulty,
        topicTag: challenge.topicTag,
        code,
      });
    })
    .catch((err) => console.error("[journal] triggerJournalEntry failed:", err));

  return { success: true as const };
}
