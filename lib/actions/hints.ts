"use server";

import type { HintChatMessage, HintStyle } from "@/lib/types";
import { getUid } from "@/lib/auth/session";
import { getCourse } from "@/lib/repositories/courses";
import { getChallenge } from "@/lib/repositories/challenges";
import { getStartOfDayUTC } from "@/lib/domain/time";
import { isChallengeBrowsable, isTodaysDailyChallenge } from "@/lib/domain/visibility";
import { generateHintReply } from "@/lib/services/openai/hintChat";

export async function sendHintChatMessage(
  courseId: string,
  challengeId: string,
  history: HintChatMessage[],
  style: HintStyle,
  draftCode?: string
): Promise<
  | { success: true; reply: string }
  | { success: false; error: "unauthenticated" | "challenge_not_found" | "chat_failed" }
> {
  const uid = await getUid();
  if (!uid) return { success: false, error: "unauthenticated" };

  const course = await getCourse(courseId);
  if (!course) return { success: false, error: "challenge_not_found" };

  const data = await getChallenge(courseId, challengeId);
  const startOfDay = getStartOfDayUTC(course.timezone);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  // Re-derive access server-side rather than trusting challengeId alone —
  // practice challenges, archived daily challenges, and the still-exclusive
  // Daily Challenge all share the same table/IDs.
  if (!data || !(isChallengeBrowsable(data, startOfDay) || isTodaysDailyChallenge(data, startOfDay, endOfDay))) {
    return { success: false, error: "challenge_not_found" };
  }

  try {
    const reply = await generateHintReply({
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      topicTag: data.topicTag,
      draftCode,
      history,
      style,
    });
    return { success: true, reply };
  } catch (err) {
    console.error("[ai] generateHintReply failed:", err);
    return { success: false, error: "chat_failed" };
  }
}
