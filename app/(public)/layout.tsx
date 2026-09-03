import { getCurrentUser } from "@/lib/auth/session";
import { PublicHeader } from "@/components/layout/PublicHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

// Deliberately no auth guard — this route group backs the crawlable,
// anonymous-reachable course detail/challenge/practice pages under
// /courses/[courseId]/**. (The catalog index itself now lives at "/" —
// see app/page.tsx.) getCurrentUser() returns null immediately for
// anonymous visitors (cookie absent, no Firestore read), so this stays
// cheap for crawler/guest traffic.
export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <PublicHeader user={user} />
      <main className="flex-1 px-5 py-8 lg:px-10 lg:py-10 max-w-6xl w-full mx-auto">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
