import { redirect } from "next/navigation";
import { requireUidOrRedirect } from "@/lib/auth/session";
import { listProjectsForInstructor } from "@/lib/actions/projects";
import { getRoster } from "@/lib/actions/instructor";
import { ProjectsSprintClient } from "@/app/(instructor)/_components/ProjectsSprintClient";

export default async function InstructorSprintPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const uid = await requireUidOrRedirect();

  const [projectsResult, rosterResult] = await Promise.all([
    listProjectsForInstructor(courseId),
    getRoster(courseId),
  ]);

  if (!projectsResult.success) {
    if (projectsResult.error === "unauthenticated") redirect("/login");
    return (
      <div className="flex flex-col gap-3 py-14 text-center">
        <p className="font-serif text-[2rem] text-text-primary font-normal">
          No course found
        </p>
        <p className="text-sm text-text-faint">
          Set up your course in Settings to get started.
        </p>
      </div>
    );
  }

  const students = rosterResult.success
    ? rosterResult.rows.map((r) => ({ id: r.id, name: r.name }))
    : [];

  return (
    <ProjectsSprintClient
      courseId={courseId}
      currentUserId={uid}
      initialProjects={projectsResult.projects}
      students={students}
    />
  );
}
