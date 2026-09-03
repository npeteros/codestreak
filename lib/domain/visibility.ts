import type { ChallengeDoc, CourseDoc } from "@/lib/types";

// A course is publicly viewable by guests iff it's both opted into public
// browsing and not archived. Reuses the same isPublic flag instructors
// already toggle to allow join-without-invite — "publicly joinable" and
// "publicly viewable" are treated as the same decision.
export function isCoursePublic(course: Pick<CourseDoc, "isPublic" | "isArchived">): boolean {
  return course.isPublic && !course.isArchived;
}

// A challenge is part of the browsable Challenges module if it's a published
// practice challenge, or a published daily challenge scheduled before the
// cutoff (i.e. it's not today's/a future day's exclusive Daily Challenge).
// Re-derived server-side wherever a challengeId reaches an action, rather
// than trusted from the caller — practice challenges and archived daily
// challenges share the same table/IDs as the still-exclusive Daily
// Challenge, so a challengeId alone doesn't prove browsability.
export function isChallengeBrowsable(data: ChallengeDoc, cutoff: Date): boolean {
  if (data.isDraft) return false;
  if (data.kind === "PRACTICE") return true;
  return data.scheduledFor !== undefined && data.scheduledFor < cutoff;
}
