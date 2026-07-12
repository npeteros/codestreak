import { redirect, notFound } from "next/navigation";
import { getStudentCheckInHistory } from "@/lib/actions/instructor";
import { CheckInHistoryClient } from "@/app/(instructor)/_components/CheckInHistoryClient";

export default async function StudentCheckInsPage({
  params,
}: {
  params: Promise<{ courseId: string; studentId: string }>;
}) {
  const { courseId, studentId } = await params;
  const result = await getStudentCheckInHistory(courseId, studentId, null);

  if (!result.success) {
    if (result.error === "unauthenticated") redirect("/login");
    notFound();
  }

  return (
    <CheckInHistoryClient
      courseId={courseId}
      studentId={studentId}
      studentName={result.studentName}
      initialItems={result.items}
      initialCursor={result.nextCursor}
    />
  );
}
