import { redirect } from "next/navigation";
import { getInstructorCourses } from "@/lib/actions/instructor";
import { CoursesHomeClient } from "@/app/(instructor)/_components/CoursesHomeClient";
import { InstructorCoursesShell } from "@/app/(instructor)/_components/InstructorCoursesShell";

export default async function NewCoursePage() {
  const result = await getInstructorCourses();

  if (!result.success) {
    if (result.error === "unauthenticated") redirect("/login");
    return null;
  }

  return (
    <InstructorCoursesShell>
      <CoursesHomeClient initialCourses={result.courses} startWithForm />
    </InstructorCoursesShell>
  );
}
