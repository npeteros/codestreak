import { getCurrentUser } from "@/lib/auth/session";
import { listPublicCourses } from "@/lib/actions/publicCatalog";
import { generateMetadata as buildMetadata } from "@/lib/seo/metadata";
import { PublicCoursesClient } from "./_components/PublicCoursesClient";

export const metadata = buildMetadata({
  title: "Browse courses — CodeStreak",
  description: "Explore public, course-based programming challenges you can start right away.",
  path: "/courses",
});

export default async function CoursesCatalogPage() {
  const [{ courses }, user] = await Promise.all([listPublicCourses(), getCurrentUser()]);

  const viewerRole = !user ? "GUEST" : user.role === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT";

  return <PublicCoursesClient initialCourses={courses} viewerRole={viewerRole} />;
}
