"use client";

import { useState, useTransition } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { ChevronDown, LogOut } from "lucide-react";
import { leaveCourse } from "@/lib/actions/courses";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export interface EnrolledCourse {
  id: string;
  name: string;
}

interface Props {
  courses: EnrolledCourse[];
}

export function StudentCourseSwitcher({ courses }: Props) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaveTarget, setLeaveTarget] = useState<EnrolledCourse | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentId = searchParams.get("courseId") ?? courses[0]?.id ?? "";
  const current = courses.find((c) => c.id === currentId) ?? courses[0];

  function handleSelect(courseId: string) {
    setOpen(false);
    const params = new URLSearchParams(searchParams.toString());
    params.set("courseId", courseId);
    router.push(`${pathname}?${params.toString()}`);
  }

  function handleLeaveConfirm() {
    if (!leaveTarget) return;
    const target = leaveTarget;
    setLeaveTarget(null);
    setOpen(false);
    startTransition(async () => {
      const res = await leaveCourse(target.id);
      if (!res.success) return;
      if (target.id === currentId) {
        const next = courses.find((c) => c.id !== target.id);
        if (next) {
          const params = new URLSearchParams(searchParams.toString());
          params.set("courseId", next.id);
          router.push(`${pathname}?${params.toString()}`);
        } else {
          router.push("/courses");
        }
      }
      router.refresh();
    });
  }

  if (courses.length === 0) return null;

  if (courses.length === 1) {
    return (
      <>
        <div className="px-3 pt-1 pb-1 flex items-center justify-between gap-2">
          <div className="font-mono text-[11px] text-text-faint truncate">
            {current?.name}
          </div>
          <button
            onClick={() => setLeaveTarget(current ?? null)}
            disabled={isPending}
            title="Leave course"
            className="text-text-faint hover:text-risk transition-colors cursor-pointer shrink-0 disabled:opacity-40"
          >
            <LogOut size={12} />
          </button>
        </div>
        <ConfirmDialog
          open={leaveTarget !== null}
          title={`Leave ${leaveTarget?.name}?`}
          message="You'll lose access to this course's challenges, check-ins, and streak history unless you rejoin."
          confirmLabel="Leave course"
          danger
          onConfirm={handleLeaveConfirm}
          onCancel={() => setLeaveTarget(null)}
        />
      </>
    );
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
            {current?.name ?? "Select course"}
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
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 bg-[#111114] border border-white/[0.1] rounded-[12px] overflow-hidden shadow-2xl py-1.5">
            {courses.map((c) => (
              <div
                key={c.id}
                className={[
                  "group w-full flex items-center gap-1 transition-colors",
                  c.id === currentId
                    ? "bg-gold/10 text-[#E4E2DB]"
                    : "text-text-secondary hover:bg-white/[0.04] hover:text-text-primary",
                ].join(" ")}
              >
                <button
                  onClick={() => handleSelect(c.id)}
                  className="flex-1 min-w-0 text-left pl-3.5 pr-2 py-2.5 flex items-center gap-2.5 cursor-pointer"
                >
                  <span className="font-sans text-[13px] font-medium truncate">
                    {c.name}
                  </span>
                  {c.id === currentId && (
                    <span className="ml-auto text-gold text-[11px]">✓</span>
                  )}
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setLeaveTarget(c);
                  }}
                  disabled={isPending}
                  title="Leave course"
                  className="pr-3.5 py-2.5 text-text-faint hover:text-risk transition-colors cursor-pointer shrink-0 opacity-0 group-hover:opacity-100 disabled:opacity-40"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={leaveTarget !== null}
        title={`Leave ${leaveTarget?.name}?`}
        message="You'll lose access to this course's challenges, check-ins, and streak history unless you rejoin."
        confirmLabel="Leave course"
        danger
        onConfirm={handleLeaveConfirm}
        onCancel={() => setLeaveTarget(null)}
      />
    </div>
  );
}
