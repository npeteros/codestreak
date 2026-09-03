import type { CheckIn } from "@/lib/types";
import { requireUidOrRedirect } from "@/lib/auth/session";
import { getStartOfDayUTC } from "@/lib/domain/time";
import { listEnrolledCourses } from "@/lib/repositories/enrollments";
import { hasCheckedInInRange, listRecentCheckIns } from "@/lib/repositories/checkins";
import { CheckInPageClient } from "./CheckInPageClient";
import type { CourseOption } from "./CheckInPageClient";

export default async function StudentCheckinPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  // 1. Verify session
  const uid = await requireUidOrRedirect();

  // 2. Fetch enrolled courses from /students/{uid}/courses hub documents
  const hub = await listEnrolledCourses(uid);

  const courses: CourseOption[] = hub
    .map(({ data: d }) => {
      if (!d.courseId || !d.courseName || !d.timezone) return null;
      return { id: d.courseId, name: d.courseName, timezone: d.timezone } satisfies CourseOption;
    })
    .filter((c): c is CourseOption => c !== null);

  // 3. Determine selected course
  const { courseId: queryCourseId } = await searchParams;
  const validIds = new Set(courses.map((c) => c.id));
  const selectedCourseId =
    queryCourseId && validIds.has(queryCourseId)
      ? queryCourseId
      : courses[0]?.id ?? "";

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  // 4. Fetch recent check-ins + duplicate check for selected course
  let initialCheckIns: CheckIn[] = [];
  let initialAlreadyCheckedIn = false;

  if (selectedCourse) {
    const startOfDay = getStartOfDayUTC(selectedCourse.timezone);
    const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

    const [recentRows, alreadyCheckedIn] = await Promise.all([
      listRecentCheckIns(uid, selectedCourseId, 7),
      hasCheckedInInRange(uid, selectedCourseId, startOfDay, endOfDay),
    ]);

    initialAlreadyCheckedIn = alreadyCheckedIn;

    initialCheckIns = recentRows.map(({ id, data }) => ({
      id,
      note: data.note,
      courseId: data.courseId ?? selectedCourseId,
      createdAt: data.createdAt.toISOString(),
    } satisfies CheckIn));
  }

  return (
    <div className="space-y-6">
      {/* Page heading */}
      <div className="space-y-1">
        <h1 className="font-serif text-[1.75rem] text-text-primary font-normal leading-tight">
          Daily Check-in
        </h1>
        <p className="text-sm text-text-secondary">
          What did you work on today?
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-14 text-center">
          <p className="text-sm text-text-faint">
            You&apos;re not enrolled in any courses yet.
          </p>
        </div>
      ) : (
        <CheckInPageClient
          courses={courses}
          initialCourseId={selectedCourseId}
          initialCheckIns={initialCheckIns}
          initialAlreadyCheckedIn={initialAlreadyCheckedIn}
        />
      )}
    </div>
  );
}
