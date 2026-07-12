import { redirect, notFound } from "next/navigation";
import { getStudentSubmissionHistory } from "@/lib/actions/instructor";
import { SubmissionHistoryClient } from "@/app/(instructor)/_components/SubmissionHistoryClient";

export default async function StudentSubmissionsPage({
  params,
}: {
  params: Promise<{ courseId: string; studentId: string }>;
}) {
  const { courseId, studentId } = await params;
  const result = await getStudentSubmissionHistory(courseId, studentId, null);

  if (!result.success) {
    if (result.error === "unauthenticated") redirect("/login");
    notFound();
  }

  return (
    <SubmissionHistoryClient
      courseId={courseId}
      studentId={studentId}
      studentName={result.studentName}
      initialItems={result.items}
      initialCursor={result.nextCursor}
    />
  );
}
