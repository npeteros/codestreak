import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { StudentNav } from "./_components/StudentNav";
import { StudentCourseSwitcher, type EnrolledCourse } from "./_components/StudentCourseSwitcher";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { StreakHeaderLoader } from "@/components/student/StreakHeaderLoader";
import { Logomark } from "@/components/brand/Logomark";

const COOKIE = "codestreak_session";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get(COOKIE);
  if (!session?.value) redirect("/login");

  let uid: string;
  try {
    const decoded = await adminAuth.verifySessionCookie(session.value, true);
    uid = decoded.uid;
  } catch {
    redirect("/login");
  }

  const hubSnap = await adminDb
    .collection("students")
    .doc(uid)
    .collection("courses")
    .get();

  const courses: EnrolledCourse[] = hubSnap.docs
    .map((doc) => {
      const d = doc.data();
      if (!d.courseId || !d.courseName) return null;
      return { id: d.courseId as string, name: d.courseName as string };
    })
    .filter((c): c is EnrolledCourse => c !== null);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-bg">
      {/* Sidebar */}
      <aside
        className="
          flex-none lg:w-[236px] lg:h-screen lg:sticky lg:top-0
          flex flex-col
          bg-sidebar
          border-b border-white/[0.07] lg:border-b-0 lg:border-r lg:border-white/[0.07]
          px-4 py-4 lg:px-4 lg:py-6
        "
      >
        {/* Logo */}
        <div className="flex items-center gap-[11px] px-2 pb-1 shrink-0">
          <Logomark className="w-7 h-7" />
          <span className="font-serif text-xl text-text-primary tracking-[-0.01em]">
            CodeStreak
          </span>
        </div>

        {/* Course switcher (desktop only) */}
        {courses.length > 0 && (
          <div className="hidden lg:block mt-4 shrink-0">
            <Suspense>
              <StudentCourseSwitcher courses={courses} />
            </Suspense>
          </div>
        )}

        {/* MODULES label (desktop only) */}
        <div className="hidden lg:block font-mono text-[10px] tracking-[.16em] text-text-faint px-[10px] pt-[14px] pb-2 shrink-0">
          MODULES
        </div>

        {/* Nav items (desktop sidebar only) */}
        <nav className="hidden lg:flex lg:flex-col gap-1">
          <Suspense>
            <StudentNav />
          </Suspense>
        </nav>

        {/* Bottom section (desktop only) */}
        <div className="hidden lg:flex lg:flex-col mt-auto gap-1 pt-4 border-t border-white/[0.06]">
          <LogoutButton />
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 min-w-0 p-5 pb-20 lg:pb-8 lg:px-10 lg:py-8">
        <div className="flex flex-col gap-[22px]">
          <Suspense
            fallback={
              <div className="bg-surface border border-white/[0.07] rounded-[18px] h-[132px] animate-pulse" />
            }
          >
            <StreakHeaderLoader />
          </Suspense>
          {children}
        </div>
      </main>
      {/* Bottom nav (mobile/tablet only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-sidebar border-t border-white/[0.07]">
        <Suspense>
          <StudentNav variant="bottom" />
        </Suspense>
      </nav>
    </div>
  );
}
