"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { joinPublicCourse } from "@/lib/actions/courses";
import { BookOpen, Users } from "lucide-react";

interface Course {
  id: string;
  name: string;
  description: string;
  languageTag: string;
  enrolledCount: number;
}

interface Props {
  initialCourses: Course[];
}

export function PublicCoursesClient({ initialCourses }: Props) {
  const router = useRouter();
  const [courses, setCourses] = useState(initialCourses);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  }

  function handleJoin(courseId: string) {
    setJoiningId(courseId);
    startTransition(async () => {
      const res = await joinPublicCourse(courseId);
      if (res.success) {
        setCourses((prev) => prev.filter((c) => c.id !== courseId));
        showToast("Joined course");
        router.refresh();
      } else {
        showToast("Failed to join — try again");
      }
      setJoiningId(null);
    });
  }

  if (courses.length === 0) {
    return (
      <div className="border border-dashed border-white/15 rounded-[15px] px-6 py-12 flex flex-col items-center gap-1.5 text-center">
        <span className="text-[14px] text-[#E4E2DB] font-medium">
          Nothing to join right now
        </span>
        <span className="text-[12.5px] text-text-muted">
          You&rsquo;re in every public course available. Ask your instructor for an invite link to join a private one.
        </span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {courses.map((c) => (
          <div
            key={c.id}
            className="bg-surface border border-white/[0.07] rounded-[15px] px-5 py-4 flex flex-col gap-3.5"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-[10px] bg-gold/10 border border-gold/20 flex items-center justify-center shrink-0">
                <BookOpen size={17} className="text-gold" />
              </div>
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-sans text-[15px] font-semibold text-[#E4E2DB] truncate">
                  {c.name}
                </span>
                <span className="font-mono text-[11px] text-text-muted">
                  {c.languageTag}
                </span>
              </div>
            </div>

            {c.description && (
              <p className="text-[12.5px] text-text-muted leading-[1.5] line-clamp-2">
                {c.description}
              </p>
            )}

            <div className="flex items-center justify-between gap-3 mt-auto pt-1">
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-text-faint">
                <Users size={13} />
                {c.enrolledCount} {c.enrolledCount === 1 ? "student" : "students"}
              </span>

              <button
                onClick={() => handleJoin(c.id)}
                disabled={isPending && joiningId === c.id}
                className="bg-gold text-bg border-none rounded-[9px] px-4 py-[8px] font-sans text-[13px] font-semibold cursor-pointer hover:brightness-105 transition-all disabled:opacity-60"
              >
                {isPending && joiningId === c.id ? "Joining…" : "Join course"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {toast && (
        <div
          className="fixed bottom-7 left-1/2 z-60 bg-[#1A1A1F] border border-gold/35 rounded-[11px] px-5 py-3 flex items-center gap-2.5 shadow-2xl"
          style={{ transform: "translateX(-50%)", animation: "csToast .2s ease" }}
        >
          <span className="w-[18px] h-[18px] rounded-full bg-gold text-bg flex items-center justify-center text-[11px] font-bold flex-none">
            ✓
          </span>
          <span className="text-[13.5px] text-[#ECEAE3]">{toast}</span>
        </div>
      )}

      <style>{`
        @keyframes csToast { from { transform:translateX(-50%) translateY(10px); opacity:0; } to { transform:translateX(-50%); opacity:1; } }
      `}</style>
    </div>
  );
}
