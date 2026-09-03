"use server";

import { getUid } from "@/lib/auth/session";
import { getUser } from "@/lib/repositories/users";
import { getFirstEnrolledCourse } from "@/lib/repositories/enrollments";
import { countSubmissionsFull } from "@/lib/repositories/submissions";
import { generateQrCodeSvg } from "@/lib/services/qrcode";
import { getStreakData } from "./streak";

const HEATMAP_DAYS = 90;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://codestreak-app.vercel.app";

export interface StoryCardData {
  streak: number;
  heatmapData: { date: string; level: number }[];
  problemsSolved: number;
  username: string;
  isPersonalBest: boolean;
  qrCodeSvg: string;
}

export async function getStoryCardData(
  courseId?: string
): Promise<
  { success: true; data: StoryCardData } | { success: false; error: string }
> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };

  let resolvedCourseId = courseId;
  if (!resolvedCourseId) {
    const hub = await getFirstEnrolledCourse(uid);
    if (!hub) return { success: false, error: "no_courses" };
    resolvedCourseId = hub.data.courseId as string;
  }

  const [streakResult, user, problemsSolved, qrCodeSvg] = await Promise.all([
    getStreakData(resolvedCourseId),
    getUser(uid),
    countSubmissionsFull(uid, resolvedCourseId),
    generateQrCodeSvg(APP_URL),
  ]);
  if (!streakResult.success) return streakResult;

  const { streak, longest, entries } = streakResult.data;

  return {
    success: true,
    data: {
      streak,
      heatmapData: entries
        .slice(-HEATMAP_DAYS)
        .map((e) => ({ date: e.date, level: e.level })),
      problemsSolved,
      username: user?.name ?? "",
      isPersonalBest: streak > 0 && streak === longest,
      qrCodeSvg,
    },
  };
}
