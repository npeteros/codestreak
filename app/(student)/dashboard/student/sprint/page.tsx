import { requireUidOrRedirect } from "@/lib/auth/session";
import { listEnrolledCourses } from "@/lib/repositories/studentHub";
import { listProjectsForStudent } from "@/lib/actions/projects";
import { SprintClient } from "./SprintClient";

export default async function StudentSprintPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>;
}) {
  const uid = await requireUidOrRedirect();

  const { courseId: queryCourseId } = await searchParams;
  const hub = await listEnrolledCourses(uid);

  const courseIds = hub.map(({ data: d }) => d.courseId).filter((id): id is string => Boolean(id));
  const validIds = new Set(courseIds);
  const courseId =
    queryCourseId && validIds.has(queryCourseId)
      ? queryCourseId
      : (courseIds[0] ?? "");

  if (!courseId) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="font-serif text-[1.7rem] text-text-primary font-normal leading-tight">
          Sprint Board
        </h1>
        <p className="text-text-muted text-sm">
          You&apos;re not enrolled in any courses yet.
        </p>
      </div>
    );
  }

  const result = await listProjectsForStudent(courseId);
  const projects = result.success ? result.projects : [];

  return <SprintClient courseId={courseId} currentUserId={uid} initialProjects={projects} />;
}
