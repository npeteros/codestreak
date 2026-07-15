import { notFound } from "next/navigation";
import { requireUidOrRedirect } from "@/lib/auth/session";
import { getUser } from "@/lib/repositories/users";
import { getCourse, listInstructorCourses } from "@/lib/repositories/courses";
import { InstructorNav } from "@/app/(instructor)/_components/InstructorNav";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { CourseSwitcher } from "@/app/(instructor)/_components/CourseSwitcher";
import { Logomark } from "@/components/brand/Logomark";

export default async function CourseLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;

  const uid = await requireUidOrRedirect();

  const [user, courseData, allCoursesList] = await Promise.all([
    getUser(uid),
    getCourse(courseId),
    listInstructorCourses(uid),
  ]);

  if (!courseData) notFound();
  if (courseData.instructorId !== uid) notFound();

  const userName = user ? user.name : "Instructor";

  const allCourses = allCoursesList.map(({ id, data }) => ({
    id,
    name: data.name,
    isArchived: data.isArchived,
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
