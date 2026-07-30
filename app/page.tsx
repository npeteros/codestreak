import { generateMetadata } from "@/lib/seo/metadata";
import { getLandingPageData } from "@/lib/actions/publicCatalog";
import { getCurrentUser } from "@/lib/auth/session";
import { LandingClient } from "@/app/_components/LandingClient";

export const metadata = generateMetadata({
  title: "CodeStreak",
  description:
    "Course-based accountability for programming students. Build the habit. Ship the code.",
  path: "/",
});

// Course/enrollment counts are fetched from Firestore, so this route can no
// longer render as pure static HTML — ISR keeps it cheap on the app's
// highest-traffic anonymous route by revalidating in the background at most
// once every 5 minutes instead of on every request.
export const revalidate = 300;

export default async function Home() {
  const [{ data }, user] = await Promise.all([getLandingPageData(), getCurrentUser()]);
  return <LandingClient data={data} user={user} />;
}
