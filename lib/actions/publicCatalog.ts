"use server";

// Guest-safe reads for the public course catalog. Every export here is
// deliberately unauthenticated — no requireRole/requireUidOrRedirect gate —
// because these back crawlable, anonymous-reachable pages under
// app/(public)/courses/**. Visibility is enforced via lib/domain/visibility.ts
// (isCoursePublic / isChallengeBrowsable) rather than a session check.
// Any mutation (join, submit) still goes through the existing authenticated
// actions in lib/actions/courses.ts / lib/actions/practiceChallenges.ts.

import type { ChallengeDifficulty, ChallengeDoc, UserDoc } from "@/lib/firebase/types";
import { getCurrentUser } from "@/lib/auth/session";
import * as coursesRepo from "@/lib/repositories/courses";
import * as enrollmentsRepo from "@/lib/repositories/enrollments";
import * as studentHubRepo from "@/lib/repositories/studentHub";
import * as usersRepo from "@/lib/repositories/users";
import * as streakEntriesRepo from "@/lib/repositories/streakEntries";
import { calcStreak } from "@/lib/actions/instructor.calc";
import {
  getChallenge,
  getScheduledChallenge,
  listPracticeChallengesPage as fetchPracticePage,
  listArchivedDailyChallengesPage as fetchDailyArchivePage,
  type BrowsableChallengeOrigin,
} from "@/lib/repositories/challenges";
import { getStartOfDayUTC } from "@/lib/domain/time";
import { isCoursePublic, isChallengeBrowsable } from "@/lib/domain/visibility";
import {
  mergePracticePage,
  INITIAL_PRACTICE_CURSOR,
  type BranchItem,
  type PracticeCursor,
  type PracticeSortDir,
} from "@/lib/domain/practiceMerge";

const PAGE_SIZE = 20;

// Shared by listPublicCourses and getLandingPageData: batch-join a set of
// courses' instructors in one round trip, plus their display initials.
function initialsFor(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("");
}

async function getInstructorsFor(
  courses: Array<{ data: { instructorId: string } }>
): Promise<Map<string, UserDoc>> {
  const ids = [...new Set(courses.map((c) => c.data.instructorId))];
  return usersRepo.getUsers(ids);
}

// Whether a course has a published DAILY challenge scheduled for "today" in
// its own timezone — the same check getPublicDailyChallenge does for a
// single course, reused here per-course for the catalog list.
async function hasChallengeToday(courseId: string, timezone: string): Promise<boolean> {
  const startOfDay = getStartOfDayUTC(timezone);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
  const scheduled = await getScheduledChallenge(courseId, startOfDay, endOfDay);
  return scheduled !== null;
}

export interface PublicCourseSummary {
  id: string;
  name: string;
  description: string;
  languageTag: string;
  enrolledCount: number;
  instructorName: string;
  instructorInitial: string;
  hasChallengeToday: boolean;
  joined: boolean;
}

export async function listPublicCourses(): Promise<{
  success: true;
  courses: PublicCourseSummary[];
}> {
  const publicCourses = await coursesRepo.listPublicActiveCourses();

  const user = await getCurrentUser();
  const joinedIds =
    user && user.role === "STUDENT"
      ? new Set((await studentHubRepo.listEnrolledCourses(user.uid)).map((h) => h.id))
      : new Set<string>();

  const sorted = publicCourses.sort((a, b) => {
    const at = a.data.createdAt?.toMillis() ?? 0;
    const bt = b.data.createdAt?.toMillis() ?? 0;
    return bt - at;
  });

  const instructors = await getInstructorsFor(sorted);

  const courses = await Promise.all(
    sorted.map(async ({ id, data }) => {
      const instructor = instructors.get(data.instructorId);
      const [enrolledCount, challengeToday] = await Promise.all([
        enrollmentsRepo.countEnrollments(id),
        hasChallengeToday(id, data.timezone),
      ]);
      return {
        id,
        name: data.name,
        description: data.description,
        languageTag: data.languageTag,
        enrolledCount,
        instructorName: instructor?.name ?? "",
        instructorInitial: instructor ? initialsFor(instructor.name) : "",
        hasChallengeToday: challengeToday,
        joined: joinedIds.has(id),
      };
    })
  );

  return { success: true, courses };
}

export interface LandingPreviewCourse {
  id: string;
  name: string;
  description: string;
  languageTag: string;
  enrolledCount: number;
  instructorName: string;
  href: string;
}

export interface LandingInstructorCard {
  name: string;
  initial: string;
  title: string;
}

export interface LandingPageData {
  previewCourses: LandingPreviewCourse[];
  languageChips: string[];
  instructorCards: LandingInstructorCard[];
  stats: { courseCount: number; studentCount: number };
}

// Powered the marketing landing page that used to render at "/" (now the
// course catalog — see app/page.tsx). Currently unused: kept for the
// archived component at app/_components/archived/LandingClient.tsx in case
// that page comes back. Deliberately unauthenticated, same rationale as
// listPublicCourses above. studentCount is a sum of per-course enrollment
// counts, not a distinct-student count — a student enrolled in two public
// courses is counted twice, an acceptable approximation for a marketing stat.
export async function getLandingPageData(): Promise<{
  success: true;
  data: LandingPageData;
}> {
  const publicCourses = await coursesRepo.listPublicActiveCourses();

  const sorted = [...publicCourses].sort((a, b) => {
    const at = a.data.createdAt?.toMillis() ?? 0;
    const bt = b.data.createdAt?.toMillis() ?? 0;
    return bt - at;
  });

  const [enrolledCounts, instructors] = await Promise.all([
    Promise.all(sorted.map(({ id }) => enrollmentsRepo.countEnrollments(id))),
    getInstructorsFor(sorted),
  ]);

  const previewCourses: LandingPreviewCourse[] = sorted.slice(0, 4).map((c, i) => ({
    id: c.id,
    name: c.data.name,
    description: c.data.description,
    languageTag: c.data.languageTag,
    enrolledCount: enrolledCounts[i],
    instructorName: instructors.get(c.data.instructorId)?.name ?? "",
    href: `/courses/${c.id}`,
  }));

  const languageChips = [...new Set(sorted.map((c) => c.data.languageTag))];

  const instructorCards: LandingInstructorCard[] = [...instructors.values()].map((u) => ({
    name: u.name,
    initial: initialsFor(u.name),
    title: "Instructor",
  }));

  const stats = {
    courseCount: sorted.length,
    studentCount: enrolledCounts.reduce((sum, n) => sum + n, 0),
  };

  return {
    success: true,
    data: { previewCourses, languageChips, instructorCards, stats },
  };
}

export interface PublicCourseDetail {
  id: string;
  name: string;
  description: string;
  languageTag: string;
  enrolledCount: number;
  instructorName: string;
  instructorInitial: string;
  otherCourse: { id: string; name: string } | null;
}

export async function getPublicCourse(
  courseId: string
): Promise<{ success: true; course: PublicCourseDetail | null }> {
  const course = await coursesRepo.getCourse(courseId);
  if (!course || !isCoursePublic(course)) {
    return { success: true, course: null };
  }

  const [enrolledCount, instructors, publicCourses] = await Promise.all([
    enrollmentsRepo.countEnrollments(courseId),
    usersRepo.getUsers([course.instructorId]),
    coursesRepo.listPublicActiveCourses(),
  ]);

  const instructor = instructors.get(course.instructorId);
  const other = publicCourses.find(
    (c) => c.id !== courseId && c.data.instructorId === course.instructorId
  );

  return {
    success: true,
    course: {
      id: courseId,
      name: course.name,
      description: course.description,
      languageTag: course.languageTag,
      enrolledCount,
      instructorName: instructor?.name ?? "",
      instructorInitial: instructor ? initialsFor(instructor.name) : "",
      otherCourse: other ? { id: other.id, name: other.data.name } : null,
    },
  };
}

export interface PublicChallengeDetail {
  id: string;
  title: string;
  description: string;
  difficulty: ChallengeDifficulty;
  topicTag: string;
  starterCode: string;
}

export async function getPublicDailyChallenge(
  courseId: string
): Promise<{ success: true; challenge: PublicChallengeDetail | null } | { success: false; error: string }> {
  const course = await coursesRepo.getCourse(courseId);
  if (!course || !isCoursePublic(course)) {
    return { success: false, error: "course_not_found" };
  }

  const startOfDay = getStartOfDayUTC(course.timezone);
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  const scheduled = await getScheduledChallenge(courseId, startOfDay, endOfDay);
  if (!scheduled) {
    return { success: true, challenge: null };
  }

  const { id, data } = scheduled;
  return {
    success: true,
    challenge: {
      id,
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      topicTag: data.topicTag,
      starterCode: data.starterCode,
    },
  };
}

export interface PublicChallengeHistoryItem {
  id: string;
  title: string;
  difficulty: ChallengeDifficulty;
  date: string;
}

export async function getPublicChallengeHistory(
  courseId: string,
  limit = 6
): Promise<{ success: true; items: PublicChallengeHistoryItem[] } | { success: false; error: string }> {
  const course = await coursesRepo.getCourse(courseId);
  if (!course || !isCoursePublic(course)) {
    return { success: false, error: "course_not_found" };
  }

  const cutoff = getStartOfDayUTC(course.timezone);
  const rows = await fetchDailyArchivePage(courseId, cutoff, {
    limit,
    cursor: null,
    sortDir: "desc",
  });

  const items: PublicChallengeHistoryItem[] = rows.map(({ id, data }) => ({
    id,
    title: data.title,
    difficulty: data.difficulty,
    date: data.scheduledFor!.toDate().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    }),
  }));

  return { success: true, items };
}

export interface PublicLeaderboardEntry {
  rank: number;
  name: string;
  streak: number;
}

// Mirrors getClassOverview's per-student streak computation
// (lib/actions/instructor.ts) minus the instructor-ownership gate — reuses
// calcStreak from lib/actions/instructor.calc.ts (not reimplemented) so this
// stays consistent with the ALL_SOURCES_RULE semantics an instructor sees
// for the same course, rather than introducing a third streak variant.
export async function getPublicLeaderboard(
  courseId: string
): Promise<{ success: true; entries: PublicLeaderboardEntry[] } | { success: false; error: string }> {
  const course = await coursesRepo.getCourse(courseId);
  if (!course || !isCoursePublic(course)) {
    return { success: false, error: "course_not_found" };
  }

  const studentIds = await enrollmentsRepo.listEnrolledStudentIds(courseId);
  if (studentIds.length === 0) {
    return { success: true, entries: [] };
  }

  const today = new Date().toLocaleDateString("en-CA", { timeZone: course.timezone });

  const [usersById, allStreakEntries] = await Promise.all([
    usersRepo.getUsers(studentIds),
    Promise.all(studentIds.map((sid) => streakEntriesRepo.listStreakEntriesDesc(sid, courseId, 365))),
  ]);

  const entries = studentIds
    .map((sid, i) => {
      const entryMap = new Map(allStreakEntries[i].map(({ id, data }) => [id, data]));
      return {
        name: usersById.get(sid)?.name ?? "Unknown",
        streak: calcStreak(entryMap, today),
      };
    })
    .sort((a, b) => b.streak - a.streak)
    .slice(0, 5)
    .map((e, i) => ({ rank: i + 1, ...e }));

  return { success: true, entries };
}

export interface PublicPracticeChallengeSummary {
  id: string;
  title: string;
  difficulty: ChallengeDifficulty;
  topicTag: string;
  origin: BrowsableChallengeOrigin;
  createdAt: string;
}

interface MergeRow {
  doc: ChallengeDoc;
  origin: BrowsableChallengeOrigin;
}

function toBranchItems(
  rows: Array<{ id: string; data: ChallengeDoc }>,
  field: "createdAt" | "scheduledFor",
  origin: BrowsableChallengeOrigin
): BranchItem<MergeRow>[] {
  return rows.map(({ id, data }) => ({
    id,
    sortValue: (field === "createdAt" ? data.createdAt : data.scheduledFor!).toDate().toISOString(),
    data: { doc: data, origin },
  }));
}

export interface ListPublicPracticeChallengesPageParams {
  cursor?: PracticeCursor | null;
  difficulty?: ChallengeDifficulty;
  sortDir?: PracticeSortDir;
}

export async function listPublicPracticeChallengesPage(
  courseId: string,
  params: ListPublicPracticeChallengesPageParams = {}
): Promise<
  | {
      success: true;
      items: PublicPracticeChallengeSummary[];
      nextCursor: PracticeCursor;
      hasMore: boolean;
    }
  | { success: false; error: string }
> {
  const course = await coursesRepo.getCourse(courseId);
  if (!course || !isCoursePublic(course)) {
    return { success: false, error: "course_not_found" };
  }

  const cutoff = getStartOfDayUTC(course.timezone);
  const sortDir = params.sortDir ?? "desc";
  const prevCursor = params.cursor ?? INITIAL_PRACTICE_CURSOR;

  const wantPractice = !prevCursor.practiceDone;
  const wantDaily = !prevCursor.dailyDone;

  const [practiceRows, dailyRows] = await Promise.all([
    wantPractice
      ? fetchPracticePage(courseId, {
          limit: PAGE_SIZE + 1,
          cursor: prevCursor.practice,
          isDraft: false,
          difficulty: params.difficulty,
          sortDir,
        })
      : Promise.resolve([]),
    wantDaily
      ? fetchDailyArchivePage(courseId, cutoff, {
          limit: PAGE_SIZE + 1,
          cursor: prevCursor.daily,
          difficulty: params.difficulty,
          sortDir,
        })
      : Promise.resolve([]),
  ]);

  const merged = mergePracticePage(
    PAGE_SIZE,
    sortDir,
    {
      items: toBranchItems(practiceRows, "createdAt", "PRACTICE"),
      requestedLimit: wantPractice ? PAGE_SIZE + 1 : 0,
    },
    {
      items: toBranchItems(dailyRows, "scheduledFor", "DAILY_ARCHIVE"),
      requestedLimit: wantDaily ? PAGE_SIZE + 1 : 0,
    },
    prevCursor
  );

  const items: PublicPracticeChallengeSummary[] = merged.items.map(({ id, data }) => ({
    id,
    title: data.doc.title,
    difficulty: data.doc.difficulty,
    topicTag: data.doc.topicTag,
    origin: data.origin,
    createdAt: data.doc.createdAt.toDate().toISOString(),
  }));

  const hasMore = !merged.nextCursor.practiceDone || !merged.nextCursor.dailyDone;

  return { success: true, items, nextCursor: merged.nextCursor, hasMore };
}

export async function getPublicPracticeChallenge(
  courseId: string,
  challengeId: string
): Promise<{ success: true; challenge: PublicChallengeDetail | null } | { success: false; error: string }> {
  const course = await coursesRepo.getCourse(courseId);
  if (!course || !isCoursePublic(course)) {
    return { success: false, error: "course_not_found" };
  }

  const data = await getChallenge(courseId, challengeId);
  const cutoff = getStartOfDayUTC(course.timezone);

  if (!data || !isChallengeBrowsable(data, cutoff)) {
    return { success: true, challenge: null };
  }

  return {
    success: true,
    challenge: {
      id: challengeId,
      title: data.title,
      description: data.description,
      difficulty: data.difficulty,
      topicTag: data.topicTag,
      starterCode: data.starterCode,
    },
  };
}
