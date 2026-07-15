"use server";

import { recordStreakActivity } from "@/lib/actions/streak";
import { triggerJournalEntry } from "@/lib/actions/journal";
import { getUid } from "@/lib/auth/session";
import { getCourse } from "@/lib/repositories/courses";
import { hasCheckedInInRange, createCheckIn as createCheckInDoc } from "@/lib/repositories/checkins";

// Returns the UTC start-of-day for the current calendar date in the given timezone.
// Uses Intl to find the UTC offset by comparing UTC noon against its local equivalent.
function getStartOfDayUTC(tz: string): Date {
  const now = new Date();
  // Today's calendar date in the course timezone (e.g. "2026-06-27")
  const dateStr = now.toLocaleDateString("en-CA", { timeZone: tz });

  // Use noon UTC as a reference to avoid DST boundary issues
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
    get("year"),
    get("month"),
    get("day"),
    get("hour"),
    get("minute"),
  ];

  // UTC offset in ms: UTC noon - local noon (treating both as ms from midnight of dateStr)
  const utcOffsetMs =
    noonUTC.getTime() - Date.UTC(lYear, lMonth - 1, lDay, lHour, lMinute);

  const [dsYear, dsMonth, dsDay] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(dsYear, dsMonth - 1, dsDay) + utcOffsetMs);
}

export async function createCheckIn(courseId: string, note: string) {
  // 1. Verify session cookie
  const uid = await getUid();
  if (!uid) {
    return { success: false as const, error: "unauthenticated" as const };
  }

  // 2. Get course timezone
  const course = await getCourse(courseId);
  if (!course) {
    return { success: false as const, error: "course_not_found" as const };
  }
  const { timezone } = course;

  // 3. Timezone-aware duplicate check
  const startOfDay = getStartOfDayUTC(timezone);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const alreadyCheckedIn = await hasCheckedInInRange(uid, courseId, startOfDay, endOfDay);

  if (alreadyCheckedIn) {
    return {
      success: false as const,
      error: "already_checked_in" as const,
    };
  }

  // 4. Write check-in
  const checkInId = await createCheckInDoc(uid, courseId, note);

  // 5. Fire-and-forget streak activity — do not block the check-in response
  recordStreakActivity({ studentId: uid, courseId, source: "checkin" }).catch(
    (err) => console.error("[streak] recordStreakActivity failed:", err)
  );

  // 5b. Fire-and-forget journal reflection — do not block the check-in response
  triggerJournalEntry(uid, courseId, { triggerType: "CHECKIN", note }).catch((err) =>
    console.error("[journal] triggerJournalEntry failed:", err)
  );

  // 6. Return serialized result (createdAt as ISO string)
  return {
    success: true as const,
    checkIn: {
      id: checkInId,
      note,
      courseId,
      createdAt: new Date().toISOString(),
    },
  };
}
