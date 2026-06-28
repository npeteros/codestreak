import { redirect } from "next/navigation";
import { getRoster } from "@/lib/actions/instructor";
import { StudentsClient } from "@/app/(instructor)/_components/StudentsClient";

export default async function InstructorStudentsPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const result = await getRoster(courseId);

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

  return <StudentsClient courseId={result.courseId} initialRows={result.rows} />;
}
