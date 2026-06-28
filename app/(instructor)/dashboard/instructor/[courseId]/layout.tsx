import { cookies } from "next/headers";
import { redirect, notFound } from "next/navigation";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import type { UserDoc, CourseDoc } from "@/lib/firebase/types";
import { InstructorNav } from "@/app/(instructor)/_components/InstructorNav";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { CourseSwitcher } from "@/app/(instructor)/_components/CourseSwitcher";
import { Logomark } from "@/components/brand/Logomark";

const COOKIE = "codestreak_session";

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

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

  const [userSnap, courseSnap, allCoursesSnap] = await Promise.all([
    adminDb.collection("users").doc(uid).get(),
    adminDb.collection("courses").doc(courseId).get(),
    adminDb
      .collection("courses")
      .where("instructorId", "==", uid)
      .orderBy("createdAt", "desc")
      .get(),
  ]);

  if (!courseSnap.exists) notFound();
  const courseData = courseSnap.data() as CourseDoc;
  if (courseData.instructorId !== uid) notFound();

  const userName = userSnap.exists ? (userSnap.data() as UserDoc).name : "Instructor";

  const allCourses = allCoursesSnap.docs.map((d) => ({
    id: d.id,
    name: (d.data() as CourseDoc).name,
    isArchived: (d.data() as CourseDoc).isArchived,
  }));

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
        {/* Logo + role badge */}
        <div className="flex items-center gap-[11px] px-2 pb-1 shrink-0">
          <Logomark className="w-7 h-7" />
          <span className="font-serif text-xl text-text-primary tracking-[-0.01em]">
            CodeStreak
          </span>
          <span className="hidden lg:inline font-mono text-[9px] tracking-[.12em] text-gold border border-gold/40 rounded px-1.5 py-0.5 shrink-0">
            INSTR
          </span>
        </div>

        {/* Course switcher (desktop only) */}
        <div className="hidden lg:block mt-4 shrink-0">
          <CourseSwitcher courses={allCourses} activeCourseId={courseId} />
        </div>

        {/* TEACH label (desktop only) */}
        <div className="hidden lg:block font-mono text-[10px] tracking-[.16em] text-text-faint px-[10px] pt-[14px] pb-2 shrink-0">
          TEACH
        </div>

        {/* Nav items (desktop sidebar only) */}
        <nav className="hidden lg:flex lg:flex-col gap-1">
          <InstructorNav />
        </nav>

        {/* Bottom section (desktop only) */}
        <div className="hidden lg:flex lg:flex-col mt-auto gap-2 pt-4 border-t border-white/[0.06]">
          <LogoutButton />
          <div className="px-3 pt-1 pb-1">
            <div className="font-mono text-[10px] tracking-[.12em] text-text-faint mb-1">
              INSTRUCTOR
            </div>
            <div className="font-sans text-[13px] font-semibold text-[#D7D5CE]">
              {userName}
            </div>
          </div>
        </div>
      </aside>

      {/* Page content */}
      <main className="flex-1 min-w-0 p-5 pb-20 lg:pb-8 lg:px-10 lg:py-8">{children}</main>

      {/* Bottom nav (mobile/tablet only) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex bg-sidebar border-t border-white/[0.07]">
        <InstructorNav variant="bottom" />
      </nav>
    </div>
  );
}
