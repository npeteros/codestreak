"use server";

import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type {
  CourseDoc,
  ChallengeDoc,
  ChallengeDifficulty,
  ChallengeSubmissionDoc,
} from "@/lib/firebase/types";
import { recordStreakActivity } from "@/lib/actions/streak";
import { triggerJournalEntry } from "@/lib/actions/journal";
import { getUid } from "@/lib/auth/session";

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

  const courseSnap = await adminDb.collection("courses").doc(courseId).get();
  if (!courseSnap.exists)
    return { success: false as const, error: "course_not_found" as const };
  const { timezone } = courseSnap.data() as CourseDoc;

  const startOfDay = getStartOfDayUTC(timezone);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const challengeSnap = await adminDb
    .collection("courses")
    .doc(courseId)
    .collection("challenges")
    .where("scheduledFor", ">=", Timestamp.fromDate(startOfDay))
    .where("scheduledFor", "<", Timestamp.fromDate(endOfDay))
    .where("isDraft", "==", false)
    .limit(1)
    .get();

  if (challengeSnap.empty) {
    return {
      success: true as const,
      challenge: null,
      alreadySubmitted: false,
      submittedCode: null,
    };
  }

  const doc = challengeSnap.docs[0];
  const data = doc.data() as ChallengeDoc;

  const submissionSnap = await adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .doc(courseId)
    .collection("challengeSubmissions")
    .where("challengeId", "==", doc.id)
    .limit(1)
    .get();

  const submission = submissionSnap.docs[0]?.data() as
    | ChallengeSubmissionDoc
    | undefined;

  return {
    success: true as const,
    challenge: {
      id: doc.id,
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      topicTag: data.topicTag,
      starterCode: data.starterCode,
    },
    alreadySubmitted: !submissionSnap.empty,
    submittedCode: submission?.code ?? null,
  };
}

export async function submitChallenge(
  courseId: string,
  challengeId: string,
  code: string
) {
  const uid = await getUid();
  if (!uid) return { success: false as const, error: "unauthenticated" as const };

  const existing = await adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .doc(courseId)
    .collection("challengeSubmissions")
    .where("challengeId", "==", challengeId)
    .limit(1)
    .get();

  if (!existing.empty) {
    await existing.docs[0].ref.update({ code });
    return { success: true as const };
  }

  await adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .doc(courseId)
    .collection("challengeSubmissions")
    .add({
      challengeId,
      code,
      submittedAt: FieldValue.serverTimestamp(),
    });

  recordStreakActivity({ studentId: uid, courseId, source: "challenge" }).catch(
    (err) => console.error("[streak] recordStreakActivity failed:", err)
  );

  adminDb
    .collection("courses")
    .doc(courseId)
    .collection("challenges")
    .doc(challengeId)
    .get()
    .then((challengeSnap) => {
      if (!challengeSnap.exists) return;
      const challenge = challengeSnap.data() as ChallengeDoc;
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
