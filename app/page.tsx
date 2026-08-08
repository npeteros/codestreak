import { generateMetadata } from "@/lib/seo/metadata";
import { listPublicCourses } from "@/lib/actions/publicCatalog";
import { getCurrentUser } from "@/lib/auth/session";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PublicCoursesClient } from "@/app/_components/PublicCoursesClient";

export const metadata = generateMetadata({
  title: "CodeStreak",
  description: "Explore public, course-based programming challenges you can start right away.",
  path: "/",
});

// Course/enrollment counts are fetched from Firestore, so this route can no
// longer render as pure static HTML — ISR keeps it cheap on the app's
// highest-traffic anonymous route by revalidating in the background at most
// once every 5 minutes instead of on every request.
export const revalidate = 300;

export default async function Home() {
  const [{ courses }, user] = await Promise.all([listPublicCourses(), getCurrentUser()]);

  const viewerRole = !user ? "GUEST" : user.role === "INSTRUCTOR" ? "INSTRUCTOR" : "STUDENT";

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <PublicHeader user={user} />
      <main className="flex-1 px-5 py-8 lg:px-10 lg:py-10 max-w-6xl w-full mx-auto">
        <PublicCoursesClient initialCourses={courses} viewerRole={viewerRole} />
      </main>
      <SiteFooter />
    </div>
  );
}
