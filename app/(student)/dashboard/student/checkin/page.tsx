import { Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { CheckIn, CheckInDoc } from "@/lib/firebase/types";
import { requireUidOrRedirect } from "@/lib/auth/session";
import { getStartOfDayUTC } from "@/lib/domain/time";
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
  let courses: CourseOption[] = [];
  const hubSnap = await adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .get();

  courses = hubSnap.docs
    .map((doc) => {
      const d = doc.data();
      if (!d.courseId || !d.courseName || !d.timezone) return null;
      return { id: d.courseId as string, name: d.courseName as string, timezone: d.timezone as string } satisfies CourseOption;
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
    const checkInsRef = adminDb
      .collection("students")
      .doc(uid)
      .collection("courses")
      .doc(selectedCourseId)
      .collection("checkIns");

    const [recentSnap, duplicateSnap] = await Promise.all([
      checkInsRef.orderBy("createdAt", "desc").limit(7).get(),
      (() => {
        const startOfDay = getStartOfDayUTC(selectedCourse.timezone);
        const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);
        return checkInsRef
          .where("createdAt", ">=", Timestamp.fromDate(startOfDay))
          .where("createdAt", "<", Timestamp.fromDate(endOfDay))
          .limit(1)
          .get();
      })(),
    ]);

    initialAlreadyCheckedIn = !duplicateSnap.empty;

    initialCheckIns = recentSnap.docs.map((doc) => {
      const data = doc.data() as CheckInDoc;
      const ts = data.createdAt as Timestamp | null;
      return {
        id: doc.id,
        note: data.note,
        courseId: data.courseId ?? selectedCourseId,
        createdAt: ts ? ts.toDate().toISOString() : new Date().toISOString(),
      } satisfies CheckIn;
    });
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
