"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { getStudentSubmissionHistory } from "@/lib/actions/instructor";
import type { SubmissionHistoryItem } from "@/lib/actions/instructor";
import { difficultyBadgeClass, formatShortDate } from "@/lib/format";

interface Props {
  courseId: string;
  studentId: string;
  studentName: string;
  initialItems: SubmissionHistoryItem[];
  initialCursor: string | null;
}

export function SubmissionHistoryClient({
  courseId,
  studentId,
  studentName,
  initialItems,
  initialCursor,
}: Props) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [openId, setOpenId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function loadMore() {
    startTransition(async () => {
      const res = await getStudentSubmissionHistory(courseId, studentId, cursor);
      if (res.success) {
        setItems((prev) => [...prev, ...res.items]);
        setCursor(res.nextCursor);
      }
    });
  }

  return (
    <div className="flex flex-col gap-5" style={{ animation: "shFade .25s ease" }}>
      <div className="flex flex-col gap-1">
        <Link
          href={`/dashboard/instructor/${courseId}/students`}
          className="font-mono text-[11px] text-text-muted hover:text-text-primary transition-colors w-fit"
        >
          ← Back to students
        </Link>
        <h2 className="font-serif font-normal text-[1.7rem] text-text-primary">
          {studentName}&rsquo;s submissions
        </h2>
        <p className="text-sm text-text-muted">
          {items.length} loaded{cursor ? " · more available" : ""}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-14 text-text-faint font-mono text-[12px]">
          No submissions yet.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {items.map((s) => {
            const open = openId === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setOpenId(open ? null : s.id)}
                className="bg-surface border border-white/[0.07] rounded-[12px] px-4 py-[14px] flex flex-col gap-[7px] cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={[
                        "font-mono text-[10px] tracking-[.06em] px-1.5 py-0.5 rounded-[5px] flex-none",
                        difficultyBadgeClass(s.difficulty),
                      ].join(" ")}
                    >
                      {s.difficulty}
                    </span>
                    <span className="text-[13.5px] text-[#E4E2DB] font-medium truncate">
                      {s.challengeTitle}
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-text-faint flex-none">
                    {formatShortDate(s.submittedAt)}
                  </span>
                </div>
                {open && (
                  <pre
                    className="text-[12px] text-[#C2C0B9] leading-[1.55] whitespace-pre-wrap break-words font-mono bg-black/20 rounded-[8px] p-3 mt-1 max-h-[400px] overflow-y-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {s.code}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      )}

      {cursor && (
        <button
          onClick={loadMore}
          disabled={isPending}
          className="self-center bg-transparent text-gold border border-gold/35 rounded-[9px] px-5 py-[9px] font-sans text-[13px] font-semibold cursor-pointer hover:bg-gold/10 transition-colors disabled:opacity-50"
        >
          {isPending ? "Loading…" : "Load more"}
        </button>
      )}

      <style>{`@keyframes shFade { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:none; } }`}</style>
    </div>
  );
}
