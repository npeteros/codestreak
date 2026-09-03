import { requireUidOrRedirect } from "@/lib/auth/session";
import { getUser } from "@/lib/repositories/users";
import { listEnrolledCourses } from "@/lib/repositories/enrollments";
import {
  StudentOverviewClient,
  type CourseOption,
} from "./StudentOverviewClient";
import { getOverviewSummary, type OverviewSummary } from "@/lib/actions/overview";

function getGreetingTime(timezone: string): string {
  const hour = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      hour: "numeric",
      hour12: false,
    }).format(new Date()),
    10
  );
  return hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";
}

export default async function StudentOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const uid = await requireUidOrRedirect();

  const [user, hub] = await Promise.all([
    getUser(uid),
    listEnrolledCourses(uid),
  ]);

  const userName = user ? user.name : "there";

  const courses: CourseOption[] = hub
    .map(({ data: d }) => {
      if (!d.courseId || !d.courseName || !d.timezone) return null;
      return {
        id: d.courseId,
        name: d.courseName,
        timezone: d.timezone,
      } satisfies CourseOption;
    })
    .filter((c): c is CourseOption => c !== null);

  const { courseId: queryCourseId } = await searchParams;
  const validIds = new Set(courses.map((c) => c.id));
  const selectedCourseId =
    queryCourseId && validIds.has(queryCourseId)
      ? queryCourseId
      : (courses[0]?.id ?? "");

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);
  const timezone = selectedCourse?.timezone ?? "UTC";
  const greetingTime = getGreetingTime(timezone);

  if (courses.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-14 text-center max-w-4xl">
        <p className="font-serif text-[2rem] text-text-primary font-normal">
          Good {greetingTime}, {userName}.
        </p>
        <p className="text-sm text-text-faint mt-4">
          You&apos;re not enrolled in any courses yet.
        </p>
      </div>
    );
  }

  const summaryResult = await getOverviewSummary(selectedCourseId);
  const initialSummary: OverviewSummary | null = summaryResult.success
    ? {
        streakData: summaryResult.streakData,
        challenge: summaryResult.challenge,
        latestCheckIn: summaryResult.latestCheckIn,
        sprint: summaryResult.sprint,
        latestJournal: summaryResult.latestJournal,
      }
    : null;

  return (
    <StudentOverviewClient
      userName={userName}
      courses={courses}
      initialCourseId={selectedCourseId}
      initialGreetingTime={greetingTime}
      initialSummary={initialSummary}
    />
  );
}
