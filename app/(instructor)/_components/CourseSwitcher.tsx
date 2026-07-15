"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Plus } from "lucide-react";

interface Course {
  id: string;
  name: string;
  isArchived: boolean;
}

interface Props {
  courses: Course[];
  activeCourseId: string;
}

export function CourseSwitcher({ courses, activeCourseId }: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const active = courses.find((c) => c.id === activeCourseId);

  function handleSelect(courseId: string) {
    setOpen(false);
    router.push(`/dashboard/instructor/${courseId}`);
  }

  return (
    <div className="relative px-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-[#101013] border border-white/[0.09] rounded-[10px] px-3 py-2.5 cursor-pointer hover:border-white/20 transition-colors"
      >
        <div className="flex flex-col gap-0.5 min-w-0 text-left">
          <span className="font-mono text-[9.5px] tracking-[.12em] text-text-faint">
            COURSE
          </span>
          <span className="font-sans text-[13px] font-semibold text-[#D7D5CE] truncate">
            {active?.name ?? "Select course"}
          </span>
        </div>
        <ChevronDown
          size={14}
          className="text-text-muted shrink-0 transition-transform"
          style={{ transform: open ? "rotate(180deg)" : "none" }}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 bg-[#111114] border border-white/[0.1] rounded-[12px] overflow-hidden shadow-2xl py-1.5">
            {courses.map((c) => (
              <button
                key={c.id}
                onClick={() => handleSelect(c.id)}
                className={[
                  "w-full text-left px-3.5 py-2.5 flex items-center gap-2.5 transition-colors cursor-pointer",
                  c.id === activeCourseId
                    ? "bg-gold/10 text-[#E4E2DB]"
                    : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
                ].join(" ")}
              >
                <span className="font-sans text-[13px] font-medium truncate">
                  {c.name}
                </span>
                {c.isArchived && (
                  <span className="font-mono text-[10px] text-text-faint border border-white/10 rounded px-1.5 py-px shrink-0">
                    archived
                  </span>
                )}
                {c.id === activeCourseId && (
                  <span className="ml-auto text-gold text-[11px]">✓</span>
                )}
              </button>
            ))}
            <div className="border-t border-white/[0.06] mt-1.5 pt-1.5">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/dashboard/instructor/new");
                }}
                className="w-full text-left px-3.5 py-2.5 flex items-center gap-2 text-text-muted hover:text-text-primary hover:bg-white/[0.04] transition-colors cursor-pointer"
              >
                <Plus size={13} className="shrink-0" />
                <span className="font-sans text-[13px]">New course</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
