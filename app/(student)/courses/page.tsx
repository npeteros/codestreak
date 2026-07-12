import { redirect } from "next/navigation";
import { getPublicCourses } from "@/lib/actions/courses";
import { PublicCoursesClient } from "./_components/PublicCoursesClient";

export default async function BrowseCoursesPage() {
  const result = await getPublicCourses();

  if (!result.success) {
    if (result.error === "unauthenticated") redirect("/login");
    return null;
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1.5">
        <h1 className="font-serif font-normal text-[2.2rem] text-text-primary tracking-[-0.01em]">
          Browse courses
        </h1>
        <p className="text-sm text-text-muted">
          Public courses you can join without an invite link.
        </p>
      </div>
      <PublicCoursesClient initialCourses={result.courses} />
    </div>
  );
}
