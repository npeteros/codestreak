import { redirect } from "next/navigation";
import { getMilestones } from "@/lib/actions/instructor";
import { SprintClient } from "@/app/(instructor)/_components/SprintClient";

export default async function InstructorSprintPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const result = await getMilestones(courseId);

  if (!result.success) {
    if (result.error === "unauthenticated") redirect("/login");
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

  return (
    <SprintClient
      courseId={result.courseId}
      initialMilestones={result.milestones}
      totalStudents={result.totalStudents}
    />
  );
}
